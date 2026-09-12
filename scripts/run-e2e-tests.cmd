@echo off
REM Runs the e2e-tests module on Windows against the native WSL docker daemon.
REM Prerequisite: scripts/start-docker-tcp-bridge.sh running in WSL.
set DOCKER_HOST=tcp://127.0.0.1:2375
echo DOCKER_HOST=%DOCKER_HOST%
call build-env.cmd -pl microservices/e2e-tests -am -Dmaven.test.skip=false -DfailIfNoTests=false -Dsurefire.failIfNoSpecifiedTests=false -Dtest=OrderToSummaryFlowIT test