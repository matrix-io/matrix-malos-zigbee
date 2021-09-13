#Zigbee driver

The zigbee driver allows application to access the zigbee capabilities of the MATRIX Creator through proto messages. the Gateway app running the zigbee stack that talks with the actual zigbee radio chip on the MATRIX Creator. 

### Pre-Requisites
cmake, git, g++  and 0MQ
```
# Add repo and key
curl -L https://apt.matrix.one/doc/apt-key.gpg | sudo apt-key add -
echo "deb https://apt.matrix.one/raspbian $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/matrixlabs.list

# Update packages and install
sudo apt-get update;
sudo apt-get upgrade;
sudo apt-get install cmake g++ git;
sudo apt-get install --yes libmatrixio-malos-dev libmatrixio-protos-dev
```
### Installing
```
sudo apt-get install matrixio-malos-zigbee
sudo reboot
```
### Cloning & compiling
```
git clone https://github.com/matrix-io/matrix-malos-zigbee.git
cd matrix-malos-zigbee
mkdir build && cd build
cmake ..
make
```
### Starting manually
```
# malos_zigbee runs as a service, but to stop it run:
sudo killall malos_zigbee

# to run manually, use:
malos_zigbee
```

### Upgrade
```
sudo apt-get update && sudo apt-get upgrade
sudo reboot
```

## Zigbee network concepts

<a href="https://github.com/matrix-io/matrix-malos-zigbee/blob/master/zigbee_addresses.png"><img src="https://github.com/matrix-io/matrix-malos-zigbee/blob/master/zigbee_addresses.png" align="right" width="500" ></a>

The key concepts you need to know to use this driver are mostly related to the zigbee network. Zigbee networks are form by nodes, each physical device connected is a node in the network.

#### EUI-64 address

Each zigbee device has a 64 bit IEEE MAC address called **EUI-64**. This is a globaly unique address, so no two IEEE based radios can have the same address.

#### Nodes

Each device connected to a zigbee network is a node, e.g. a bulb, a smart outlet or a simple light switch. A much shorter 16 bit address called **nodeID** is used to identify nodes in the network. The **NodeID** is a unique address in the network similar to an IP address. This address is asigned when the devices join the network.

#### Endpoints

Each Node cointains one or more **Endpoints**. Endpoints implement one type of **Application Profiles**, so multiples logical devices (Application Profiles) can exist with one physical device (node).

#### Clusters

Furthermore each Endpoint can support the functionality of one or more **clusters**. Cluster are a collection of attributes and commands, which together define a communication interface between two devices. Each cluster is defined by a **clusterID** number. Examples of cluster are: 

|  Cluster name | clusterID	| Description	|
|:--------------|:---------:|:--------------|
|ON_OFF			|0x0006		|Attributes and commands for switching devicesbetween ‘On’ and ‘Off’ states. |
|LEVEL_CONTROL	|0x0008		|Attributes and commands for controlling devices that can be set to a level between fully ‘On’ and fully ‘Off’|
|COLOR_CONTROL	|0x0300		|Attributes and commands for controlling the color properties of a color-capable light|
|SCENES			|0x0005		|Attributes and commands for scene configuration and manipulation.|

#### Example

Let's say we have a zigbee network of a MATRIX Creator, a smart bulb and a smart outlet. Each device will have their own **NodeID** that makes them unique in the network. Also each device would have a certain number of **Endpoints** where they implement a specific set of functionalities. Then inside each **Endpoint** each device will implement clusters related to that Endpoint.

For example , the bulb probably could implement a Home Automation Profile in one of its **Endpoints**, the clusters inside this **Endpoint** could be ON_OFF, LEVEL_CONTROL, COLOR_CONTROL and SCENES cluster. On the other hand the smart outlet just implements the ON_OFF and SCENES clusters, because it's only capable of turning its output on and off.

## Using the driver

There are some steps to follow in order to check the state of the connection before start communicating with the smart devices in the network:

+ Checking the conection with the Gateway   
 + If no connection with the Gateway, reset the Gateway
+ Then check the zigbee network status.
 + If its down you can turn it on
+ Open the network to allow devices to join the network (while the network is up)
+ Then you can start turning on you zigbee devices and waiting for the zigbee network automatic discovery to give you all the info for the devices connected.
+ With this info you can see what types of zigbee devices are connected, so you can decide which ones you want to interact with.
+ And finally you can start sending commands to turning lights on/off, setting colors, controlling your smart outlet or any other device.

Ok, let's go step by step:

#### Checking the conection with the Gateway   
To request the status of the connection with the Gateway send the zigbee IS_PROXY_ACTIVE command.

For example (NodeJS):
```
var protoBuilder = protoBuf.loadProtoFile('../../protocol-buffers/malos/driver.proto');
var matrixMalosBuilder = protoBuilder.build("matrix_malos");
config.zigbee_message.network_mgmt_cmd.set_type(
	matrixMalosBuilder.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes.IS_PROXY_ACTIVE)
configSocket.send(config.encode().toBuffer());
```
You'll receive a IS_PROXY_ACTIVE command back from the driver with the state of the conection in the `is_proxy_active` field of the `NetworkMgmtCmd` command.

Here is an example:
```
...
var subSocket = zmq.socket('sub');
subSocket.connect('tcp://' + creator_ip + ':' + (create_zigbee_base_port + 3));
subSocket.subscribe('');
subSocket.on('message', function(buffer) {

	switch (zig_msg.network_mgmt_cmd.type) {
		...
		case matrixMalosBuilder.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes.IS_PROXY_ACTIVE:
			if (zig_msg.network_mgmt_cmd.is_proxy_active) {
			  console.log('Gateway connected');
			  gateway_up = true; 
			} else {
			  console.log('Gateway Reset Failed.');
			  process.exit(1);
			}
			...
		break;
    ...
}
...
``` 

#### Resetting the Gateway

If from the previous step you get that the Gateway is not connected, you can reset it using the command RESET_PROXY.

Example:

```
...
config.zigbee_message.set_type(matrixMalosBuilder.ZigBeeMsg.ZigBeeCmdType.NETWORK_MGMT);
config.zigbee_message.network_mgmt_cmd.set_type(
	matrixMalosBuilder.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes.RESET_PROXY);
configSocket.send(config.encode().toBuffer());
...
```

#### Checking the zigbee network status 

After your check the conection with the Gateway is working, you have ton check the status of the zigbee network.
To check the zigbbe network status use the NETWORK_STATUS command.

Example of sending a NETWORK_STATUS command :

```
...
config.zigbee_message.network_mgmt_cmd.set_type(
	matrixMalosBuilder.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes.NETWORK_STATUS)
configSocket.send(config.encode().toBuffer());
...
```
After sending the NETWORK_STATUS command you should receive a NETWORK_STATUS back with the response.
Example:
```
...
switch (zig_msg.network_mgmt_cmd.network_status.type) {
	case matrixMalosBuilder.ZigBeeMsg.NetworkMgmtCmd.NetworkStatus.Status.NO_NETWORK:
		console.log('No Zigbee network present');
		// Doing something like ... creating a new zigbee network
	break;
	...
}
...
```

#### Creating a new Zigbee network

To create a new Zigbee network use the CREATE_NWK command.

Example:

```
...
config.zigbee_message.network_mgmt_cmd.set_type(
	matrixMalosBuilder.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes.CREATE_NWK)
configSocket.send(config.encode().toBuffer());
...
```
After you sent this command you should receive a NETWORK_STATUS with the result.

#### Allowing devices to joing

When you have successfully created the Zigbee network is time to start connecting devices to it. In orther to add new devices you have to put the network in joining status. Use the PERMIT_JOIN command for this.

Example:

```
...
config.zigbee_message.set_type(matrixMalosBuilder.ZigBeeMsg.ZigBeeCmdType.NETWORK_MGMT);
config.zigbee_message.network_mgmt_cmd.set_type(
	matrixMalosBuilder.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes.PERMIT_JOIN);
var permit_join_params = new matrixMalosBuilder.ZigBeeMsg.NetworkMgmtCmd.PermitJoinParams;
permit_join_params.setTime(60); // putting the network in joining state for 60 sec
config.zigbee_message.network_mgmt_cmd.set_permit_join_params(permit_join_params);
configSocket.send(config.encode().toBuffer());
...
```
After you send this command the network will be looking for new devices. Now you have to go and turn on the devices you want to add to the network. Also, you have to make sure the devices have been reset (unpair from any prevoius zigbee network, if the device is new there isn't need for resetting).

#### Getting the discovery data
After sending a joining command you should wait for the discovery info message DISCOVERY_INFO that the driver sends you when it finish to read all info of the new devices connected.

Example:

```
var subSocket = zmq.socket('sub');
subSocket.connect('tcp://' + creator_ip + ':' + (create_zigbee_base_port + 3));
subSocket.subscribe('');
subSocket.on('message', function(buffer) {
  	var zig_msg = new matrixMalosBuilder.ZigBeeMsg.decode(buffer);
    switch (zig_msg.network_mgmt_cmd.type) {
	...
	case matrixMalosBuilder.ZigBeeMsg.NetworkMgmtCmd.NetworkMgmtCmdTypes.DISCOVERY_INFO:
      
		var zig_msg = new matrixMalosBuilder.ZigBeeMsg.decode(buffer).toRaw();
      
		// Looking inside the list of devices from the discovery info 
		for (var i = 0; i < zig_msg.network_mgmt_cmd.connected_nodes.length; i++) {
			for (var j = 0;j < zig_msg.network_mgmt_cmd.connected_nodes[i].endpoints.length;j++) {
			  for (var k = 0; k < zig_msg.network_mgmt_cmd.connected_nodes[i].endpoints[j].clusters.length;k++) {
			  // ... do something
			  }
			}
		}

	break;
	...
	}
}

```
With the the discovery data you can "see" which devices joined and what type of Endpoints, Clusters they implement. So, now you can elaborate a list of devices and store relevant data from them:

Example :
+ NodeId's
+ Endpoint numbers
+ Clusters implemented 

#### Controlling the devices
At this point you will have a list of devices conected. Also access to the NodeId's, clusters and all the details about each device.
Let's send TOGGLE commands to all nodes connected every 2 seconds.
```
...
function ToggleNodes() {
  if (!nodes_discovered) return;
  config.zigbee_message.set_type(matrixMalosBuilder.ZigBeeMsg.ZigBeeCmdType.ZCL);
  config.zigbee_message.zcl_cmd.set_type(matrixMalosBuilder.ZigBeeMsg.ZCLCmd.ZCLCmdType.ON_OFF);
  config.zigbee_message.zcl_cmd.onoff_cmd.set_type(
      matrixMalosBuilder.ZigBeeMsg.ZCLCmd.OnOffCmd.ZCLOnOffCmdType.TOGGLE);

  setInterval(function() {
    for (var i = 0; i < nodes_id.length; i++) {
      
      process.stdout.write('Sending toggle command to Node: ')
      process.stdout.write(nodes_id[i] + "\n")

      config.zigbee_message.zcl_cmd.set_node_id(nodes_id[i]);
      config.zigbee_message.zcl_cmd.set_endpoint_index(endpoints_index[i]);
      configSocket.send(config.encode().toBuffer());
    }
  }, 2000);
}
...
```

## Configuring message 
After your device is connected and you want to send commands to it, first you need to configure the message that you want to send. Let's start with turning on/off the device first.

#### Turning on/off device (s)
To turn on/off your device you have to create the message with the `DriverConfig` function `create({})` that receives the properties `type` and another property called `zclCmd` (since the type we are passing is the `ZCL` then we have to use this `zclCmd` property). These properties names all are defined in matrix-protos dependecie. When passing the `zclCmd` property, we need to use the function `create({})` from the `matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd` to configure this zclCmd Object.

Now this (second) function `create({})` will receive the property `type` (from now on this can be changed to use whatever message you want, like turning on/off, color control, level or identify commands). Since we are going to turn on/off the device, the type should be the `ON_OFF` in the `matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.ZCLCmdType.ON_OFF` (the types inside the ZCLOnOffCmdType are `ON_OFF`, `LEVEL`, `COLOR_CONTROL` and `IDENTIFY`.

Each type of command from `ZCLCmdType` are related to a property that you should pass in the second function `create({})`. These are the correlation of types and propertys:

+ Type: ON_OFF ->  Property: onoffCmd
+ Type: LEVEL -> Property: levelCmd
+ Type: COLOR_CONTROL -> Property: colorcontrolCmd
+ Type: IDENTIFY -> Property: identifyCmd

As the `zclCmd` the `onoffCmd` (and the others properties) needs to create the object with the function `create({})`. Since we want to turn on/off the device we just need to pass the type of the command we want to execute. The `OnOffCmd` has three types of commands and they all are inside the `OnOffCmd.ZCLOnOffCmdType`:

+ ON
+ OFF
+ TOGGLE

After creating the zigbee message as specified we just need to encode and send the message as explained in the `Controlling the devices` section above. Your zigbee message should be something like this: 

```
...
  var zb_toggle_msg = matrix_io.malos.v1.driver.DriverConfig.create({
    zigbeeMessage: matrix_io.malos.v1.comm.ZigBeeMsg.create({
      type: matrix_io.malos.v1.comm.ZigBeeMsg.ZigBeeCmdType.ZCL,
      zclCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.create({
        type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.ZCLCmdType.ON_OFF,
        onoffCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.OnOffCmd.create({
          type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.OnOffCmd
                    .ZCLOnOffCmdType.TOGGLE,
          nodeId: 0,
          endpointIndex: 0
        })
      })
    })
  });
...
```

#### Working with level control
From now on the structure to work with commands are very simillar to the above one. Now we are going to work with level control, for that, first in the `zclCmd` property we need to set up the `type` as `ZCLCmdType.LEVEL`. The Level control has 2 types to work on, they are:

+ Type: MOVE_TO_LEVEL -> Property: moveToLevelParams
+ Type: MOVE -> Property: moveParams

Now that you have choose the command type you want to work, you need to create the object with the function `create({})` for the respective command you are working. Each command has it owns propertys also, they are related like this:

- MOVE_TO_LEVEL
	- level (Integer)
	- transitionTime (Integer)
- MOVE
	- move (Integer)
	- rate (Integer)

```
...
 var zb_toggle_msg = matrix_io.malos.v1.driver.DriverConfig.create({
        zigbeeMessage: matrix_io.malos.v1.comm.ZigBeeMsg.create({
          type: matrix_io.malos.v1.comm.ZigBeeMsg.ZigBeeCmdType.ZCL,
          zclCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.create({
            type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.LEVEL,
            levelCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.LevelCmd.create({
              type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.LevelCmd.ZCLLevelCmdType.MOVE,
              moveParams: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd
                        .LevelCmd.MoveCmdParams.create({
				move: 10,
				rate: 5,
                nodeId: 0,
                endpointIndex: 0
              })
            })
          })
        })
      });
...
```

#### Working with colors
The structure to work with colors is very similar as working with turning on/off devices. When working with colors we have 3 more functions choose to work. They are:

+ Function MoveToHueCmdParams -> Type: MOVETOHUE -> Property: movetohueParams
+ Function MoveToSatCmdParams -> Type: MOVETOSAT -> Property: movetosatParams
+ Function MoveToHueAndSatCmdParams -> Type: MOVETOHUEANDSAT -> Property: movetohueandsatParams

Following the example of `Turning on/off device(s)`, first we choose the type `COLOR_CONTROL` of the `ZCLCmd`. Then when creating object of the property `colorcontrolCmd`, we choose one of the types available to work with:

+ MOVETOHUE: This type controls the color that will be changed in the device
+ MOVETOSAT: This type controls the saturation of the light in the device
+ MOVETOHUEANDSAT: This type controls both the color and saturation in the device

After choosing the property we want to work, we call their respective function `create({})` and pass their properties and values. For the first type (MOVETOHUE) the properties are `hue` (an integer), `transitionTime` (an integer) and `direction` (specified in `MoveToHueCmdParams.DirectionParam`). These properties are not required, if not passed they all are setted to a default value. Then you should have something like this:

```
...
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
...
```

#### Identifying itself
As said before, the Identify command structure works similar as the other ones. First we set the `type` property inside the `zclCmd` to `ZCLCmd.IDENTIFY`. The Identify command also has two type of commands with the follow properties:

- IDENTIFY_ON
	- endpoint (Integer)
	- identifyTime (Integer)
- IDENTIFY_OFF
	- identifyTime (Integer)

Then you should have something like this: 
```
...
 var zb_toggle_msg = matrix_io.malos.v1.driver.DriverConfig.create({
        zigbeeMessage: matrix_io.malos.v1.comm.ZigBeeMsg.create({
          type: matrix_io.malos.v1.comm.ZigBeeMsg.ZigBeeCmdType.ZCL,
          zclCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.create({
            type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.IDENTIFY,
            identifyCmd: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.IdentifyCmd.create({
              type: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd.IdentifyCmd.ZCLIdentifyCmdType.IDENTIFY_ON,
              identifyOnParams: matrix_io.malos.v1.comm.ZigBeeMsg.ZCLCmd
                        .IdentifyCmd.IdentifyOnCmdParams.create({
				endpoint: 0,
				identifyTime: 0,
                nodeId: 0,
                endpointIndex: 0
              })
            })
          })
        })
      });
...
```
