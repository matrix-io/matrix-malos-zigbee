#Zigbee driver

The zigbee driver allows application to access the zigbee capabilities of the MATRIX Creator through proto messages. the Gateway app running the zigbee stack that talks with the actual zigbee radio chip on the MATRIX Creator. 

## Zigbee network concepts

<a href="https://github.com/matrix-io/matrix-creator-malos/blob/yc/zigbee_doc/docs/zigbee-addresses.png"><img src="https://github.com/matrix-io/matrix-creator-malos/blob/yc/zigbee_doc/docs/zigbee-addresses.png" align="right" width="500" ></a>

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

For example , the bulb probably implements a Home Automation Profile in one of its **Endpoints**, and the clusters inside this **Endpoint** : ON_OFF, LEVEL_CONTROL, COLOR_CONTROL and SCENES clusters. On the other hand the smart outlet just implements the ON_OFF and SCENES clusters, because it's only capable of turning its output on and off.

## Using the driver

There are some steps to follow in order to check the state of the connection before start communicating with the smart devices in the network:

+ Checking the conection with the Gateway   
 + If no connection with the Gateway, reset the Gateway
+ Then check the zigbee network status.
 + If its down you can turn it on
+ Open the network to allow devices to join the netwotk (while the network is up)
+ Then you can start turning on you zigbee devices and waiting for the zigbee network automatic discovery to give you all the info for the devices connected.
+ With this info you can see what types of zigbee devices are connected, so you can decide which ones you want to interact with.
+ And finally you can start turning lights on/off, setting colors, or controlling your smart outlet.

#### Checking the conection with the Gateway   
#### Checking the zigbee netwotk status 
#### Allowing devices to joing
#### Getting the discovery data
#### 
