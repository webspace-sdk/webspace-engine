#!/usr/bin/env bash
HAB_STUDIO_ROOT=/hab/studios/jel bio studio run ls
sudo mkdir -p /hab/studios/jel/root/.ssh
sudo cp ~/.ssh/* /hab/studios/jel/root/.ssh
HAB_STUDIO_ROOT=/hab/studios/jel bio studio enter
