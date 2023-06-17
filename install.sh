#!/bin/bash

# Exit on error; Undefined variables are errors
set -e
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
pushd "${SCRIPT_DIR}"
. ../lib-sh-common
IMAGE_NAME=smtp2http

print_help() {
  cat << EOF
Install and run ${Image_Name}. A simple smtp server to receive motion detection email from
NVR systems, and save the screen captures from those emails in a "snaps" directory. Also,
fire off an HTTP request to notify HomeBridge of events.

Usage: ${0##*/} [-i <img_name>] [-h <home_net_name>] [--help]
  -i|--image:	   Name to give to the created Docker image and containers. (${IMAGE_NAME})
  -h|--home-net: Name of the home docker bridge network connecting homekit containers. (${HOME_NET_NAME})
  --help:        Display this help and exit.
EOF
}

# Read in command line arguments
while [[ $# -gt 0 ]]>/dev/null; do
  case $1 in
    -i|--image)
      IMAGE_NAME="$2"
      shift # past argument
      shift # past value
      ;;
    -h|--home-net)
      HOME_NET_NAME="$2"
      shift # past argument
      shift # past value
      ;;
    --help)
      print_help
      exit
      ;;
    *)
      print_help >&2
      exit 1
      ;;
  esac
done

# Check for sudo
#verify_sudo

# Verify Docker is installed & container does not yet exist.
verify_no_container "${IMAGE_NAME}"

# Verify home network (shared by all homekit-related containers) is already created.
verify_network "${HOME_NET_NAME}"
# Don't need the subnet, but we should still verify the home network exists
#HOME_SUBNET=${_SUBNET}


####################################################################################
# Begin Install
echo "Installing ${IMAGE_NAME}..."
set -x

# Ensure we have a snaps directory ready for volume sharing
sudo mkdir -p /opt/${HOME_NET_NAME}/snaps
sudo chown root:root /opt/${HOME_NET_NAME}/snaps
sudo chmod a+rw /opt/${HOME_NET_NAME}/snaps

# Create and start the docker container
export _HOME_NET_NAME="${HOME_NET_NAME}"
export _MY_IP_ADDR=$(get_home_ip_address_for "smtp2http" && echo ${_IP_SMTP2HTTP})
export _HOMEBRIDGE_ADDR="homebridge"
export _PROJECT_NAME="${IMAGE_NAME}"
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" -p "${IMAGE_NAME}" up --build -d

####################################################################################
# Done
popd && echo "Done."
