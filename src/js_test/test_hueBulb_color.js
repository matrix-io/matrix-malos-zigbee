// NOTE: This file could be better. We know.

// This is how we connect to the creator. IP and port.
// The IP is the IP I'm using and you need to edit it.
// By default, MALOS has its 0MQ ports open to the world.

// Every device is identified by a base port. Then the mapping works
// as follows:
// BasePort     => Configuration port. Used to config the device.
// BasePort + 1 => Keepalive port. Send pings to this port.
// BasePort + 2 => Error port. Receive errros from device.
// BasePort + 3 => Data port. Receive data from device.

var creator_ip = '127.0.0.1';
var create_zigbee_base_port = 40000 + 1;

var zmq = require('zmq');
require('timers')
var async = require('async');
var _ = require('lodash');

// Import MATRIX Proto messages
var matrix_io = require('matrix-protos').matrix_io


var zigbee_network_up = false;
var gateway_up = false;
var attemps = 10;
var device_detected = false;

// status
var none = 0;
var status = none;
var waiting_for_devices = 1;
var waiting_for_network_status = 2;
var nodes_discovered = 3;
var nodes_id = [];
var endpoints_index = [];



//-----  Print the errors that the ZigBee driver sends ------------
var errorSocket = zmq.socket('sub'); 
errorSocket.connect('tcp://' + creator_ip + ':' +
                    (create_zigbee_base_port + 2));
errorSocket.subscribe('');
errorSocket.on('message', function(error_message) {
  process.stdout.write('Message received: ' + error_message.toString('utf8') +
                       "\n");
});


// ------------ Starting to ping the driver -----------------------

var pingSocket = zmq.socket('push');
pingSocket.connect('tcp://' + creator_ip + ':' + (create_zigbee_base_port + 1));
pingSocket.send('');  // Ping the first time.

setInterval(function() { pingSocket.send(''); }, 1000);

// -------------- Receive Data from Driver  ----------------------

var subSocket = zmq.socket('sub');
subSocket.connect('tcp://' + creator_ip + ':' + (create_zigbee_base_port + 3));

subSocket.subscribe('');
subSocket.on('message', function(buffer) {

  var zig_msg = matrix_io.malos.v1.comm.ZigBeeMsg.decode(buffer);

  if (matrix_io.malos.v1.comm.ZigBeeMsg.ZigBeeCmdType.NETWORK_MGMT) {
    checkNetworkManagementType(zig_msg, zig_msg.networkMgmtCmd.type,
      matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes,
      buffer);
  }
});

// ---------------- Toggle ------------------  
function ToggleNodes() {
  if (!nodes_discovered) return;
  setInterval(function() {
    nodes_id.map(function(){
      var zb_toggle_msg = matrix_io.malos.v1.driver.DriverConfig.create({
        zigbeeMessage: matrix_io.malos.v1.comm.ZigBeeMsg.create({
          type: matrix_io.malos.v1.comm.ZigBeeMsg.ZigBeeCmdType.ZCL,
          zclCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.create({
            type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.COLOR_CONTROL,
            colorcontrolCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.ColorControlCmd.create({
              type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.ColorControlCmd
                        .ZCLColorControlCmdType.MOVETOHUEANDSAT,
              movetohueandsatParams: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd
                        .ColorControlCmd.MoveToHueAndSatCmdParams.create({
                hue: Math.floor((Math.random()*338) + 153),
                transitionTime: 1,
                saturation: 100,
                nodeId:0,
                endpointIndex: 0
              })
            })
          })
        })
      });

      process.stdout.write('Sending toggle to Node: ')
      process.stdout.write(nodes_id[i] + "\n")
      zb_toggle_msg.zigbeeMessage.zclCmd.nodeId = nodes_id[i];
      zb_toggle_msg.zigbeeMessage.zclCmd.endpointIndex = endpoints_index[i];
      
      configSocket.send(
        matrix_io.malos.v1.driver.DriverConfig.encode(zb_toggle_msg).finish());
    });
  }, 2000);
}

// ---------------------------- Function to check network management type ---------
function checkNetworkManagementType(zigMessage, type, mgmTypes, buffer) {
  if (type === mgmTypes.DISCOVERY_INFO && status == waiting_for_devices) {
    var zig_msg = matrix_io.malos.v1.comm.ZigBeeMsg.decode(buffer);
    // Looking for nodes that have an on-off cluster
    console.log('Device(s) found!!!');
    console.log('Looking for nodes that have an on-off cluster.');

    async.map(zig_msg.networkMgmtCmd.connectedNodes, function(nodes) {
      async.map(nodes.endpoints, function(endpoint) {
        async.map(endpoint.clusters, function(cluster) {
          if (cluster.clusterId == 6) {
            // saving the nodeId and endpointIndex
            nodes_id.push(nodes.nodeId);
            endpoints_index.push(endpoint.endpointIndex);
          }
        });
      });
    });

    if (nodes_id.length > 0) {
      status = nodes_discovered;
      process.stdoutwrite(nodes_id.length + 
                           ' nodes found with on-off cluster\n');
      console.log("NODES DISCOVERED");
    } else {
      status = none;
      console.log('No devices found !');
      process.exit(1);
    }
 
  // Start toggling the nodes
  ToggleNodes();

  } else if(type === mgmTypes.IS_PROXY_ACTIVE) {

    if (zigMessage.networkMgmtCmd.isProxyActive) {
      console.log('Gateway connected');
      gateway_up = true;
    } else {
      console.log('Gateway Reset Failed.');
      process.exit(1);
    }
    
    console.log('Requesting ZigBee Network Status');
    zb_network_msg.zigbeeMessage.networkMgmtCmd.type = mgmTypes.NETWORK_STATUS;
    configSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(zb_network_msg).finish());
    status = waiting_for_network_status;
  } else if (type === mgmTypes.NETWORK_STATUS && status == waiting_for_network_status) {
    process.stdout.write('NETWORK_STATUS: ');
    status = none;
    checkNetwork(zigMessage.networkMgmtCmd.networkStatus.type,
      matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.NetworkStatus.Status);
  }
}

// ---------------------------- Function to check network status -------
function checkNetwork(type, networkStatus) {
  
  const networkTypes = matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes;

  if (type === networkStatus.NO_NETWORK){
    console.log('NO_NETWORK');
    console.log('Creating a ZigBee Network');

    zb_network_msg.zigbeeMessage.networkMgmtCmd.type =networkTypes.CREATE_NWK;
    configSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(zb_network_msg).finish());
    status = waiting_for_network_status;
  } else if (type === networkStatus.JOINED_NETWORK){
    console.log('JOINED_NETWORK message received');
    zb_network_msg.zigbeeMessage.networkMgmtCmd.type = networkTypes.PERMIT_JOIN;
    zb_network_msg.zigbeeMessage.networkMgmtCmd.permitJoinParams.time = 60;
    configSocket.send(matrix_io.malos.v1.driver.DriverConfig.encode(zb_network_msg).finish());

    console.log('Please reset your zigbee devices');
    console.log('... Waiting 60 sec for new devices');
    status = waiting_for_devices;
  } else {
    const message = type === status.JOINING_NETWORK ? 'JOINING_NETWORK message received' 
                  : type === status.JOINED_NETWORK_NO_PARENT ? 'JOINED_NETWORK_NO_PARENT'
                  : type === status.LEAVING_NETWORK ? 'LEAVING_NETWORK message received'
                  : null;
    if(!_.isNull(message)) console.log(message);
    console.log('JOINING_NETWORK message received');
  }
}

function ResetGateway() {
  console.log('Reseting the Gateway App');
  zb_network_msg.zigbeeMessage.networkMgmtCmd.type =
      matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes
          .RESET_PROXY;
  configSocket.send(
      matrix_io.malos.v1.driver.DriverConfig.encode(zb_network_msg).finish());
}

function IsGatewayActive() {
  console.log('Checking connection with the Gateway');
  zb_network_msg.zigbeeMessage.networkMgmtCmd.type =
      matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes
          .IS_PROXY_ACTIVE;
  configSocket.send(
    matrix_io.malos.v1.driver.DriverConfig.encode(zb_network_msg).finish());
}

// ----- Create the socket for sending data to the ZigBee driver ---- 

var configSocket = zmq.socket('push');
configSocket.connect('tcp://' + creator_ip + ':' + create_zigbee_base_port);

// ----------------    Start configuration --------------------- 

var init_config = matrix_io.malos.v1.driver.DriverConfig.create({
  delayBetweenUpdates: 1.0,  // 1 seconds between updates.
  timeoutAfterLastPing: 1.0 // Stop sending updates 6 seconds after pings.
});
configSocket.send(
  matrix_io.malos.v1.driver.DriverConfig.encode(init_config).finish());

// ------------ Creating Basic Network Managment proto message--------

var zb_network_msg = matrix_io.malos.v1.driver.DriverConfig.create({
  zigbeeMessage: matrix_io.malos.v1.comm.ZigBeeMsg.create({
    type: matrix_io.malos.v1.comm.ZigBeeMsg.ZigBeeCmdType.NETWORK_MGMT,
    networkMgmtCmd: matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.create({
      type: matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes
                .PERMIT_JOIN,
      permitJoinParams: matrix_io.malos.v1.comm.ZigBeeMsg.NetworkMgmtCmd
                            .PermitJoinParams.create({time: 60})
    })
  })
});

ResetGateway();
console.log('Waiting 3 sec .....\n');
setTimeout(IsGatewayActive,3000);