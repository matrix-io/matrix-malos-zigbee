cmake_minimum_required(VERSION 2.8)

add_definitions(-std=c++11)

include (../cmake/FatalWarnings.cmake)
ADM_EXTRA_WARNINGS()

find_package(Protobuf 3 REQUIRED)
find_package(Threads REQUIRED)

# This won't find ZQM in custom locations.
# FIXME(nelson.castillo): Improve.

FIND_LIBRARY(ZMQ_LIB NAMES zmq)
FIND_LIBRARY(MATRIX_PROTOS_LIB NAMES matrixio_protos)
FIND_LIBRARY(MATRIX_LIB NAMES matrix_malos)
FIND_LIBRARY(MATRIX_ZMQ_LIB NAMES matrix_malos_zmq)
FIND_LIBRARY(WIRINGPI_LIB NAMES wiringPi)
FIND_LIBRARY(WIRINGPI_DEV_LIB NAMES wiringPiDev)

message(STATUS "ZMQ found => " "${ZMQ_LIB}")
message(STATUS "MATRIX LIB found => " "${MATRIX_LIB}")
message(STATUS "MATRIX ZMQ LIB found => " "${MATRIX_ZMQ_LIB}")
message(STATUS "MATRIX_PROTOS_LIB LIB found => " "${MATRIX_PROTOS_LIB}")

include_directories(${PROJECT_BINARY_DIR})

set(malos_zigbee_src
  malos_zigbee.cpp
  driver_zigbee.cpp driver_zigbee.h
  tcp_client.cpp tcp_client.h
  ${MALOS_PROTO_SRC} ${MALOS_PROTO_HEADER}
)

add_executable(malos_zigbee ${malos_zigbee_src})
  set_property(TARGET malos_zigbee PROPERTY CXX_STANDARD 11)
  target_link_libraries(malos_zigbee ${MATRIX_LIB})
  target_link_libraries(malos_zigbee ${MATRIX_PROTOS_LIB})
  target_link_libraries(malos_zigbee ${PROTOBUF_LIBRARY})
  target_link_libraries(malos_zigbee ${CMAKE_THREAD_LIBS_INIT})
  target_link_libraries(malos_zigbee ${MATRIX_ZMQ_LIB} ${ZMQ_LIB})

# Binary to be installed.
install(TARGETS malos_zigbee DESTINATION bin)
