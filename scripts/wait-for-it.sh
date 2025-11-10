#!/bin/sh
# wait-for-it.sh: Wait for a service to be ready

# usage: wait-for-it host:port [-s] [-- command args]
# -s, --strict               Only execute subcommand if the test succeeds
# -q, --quiet                Don't output any status messages
# -t TIMEOUT, --timeout=     Timeout in seconds, zero for no timeout
# -- COMMAND ARGS            Execute command with args after the test finishes

set -e

TIMEOUT=30
STRICT=false
QUIET=false
# check to see if the command is still running before trying to kill it
PIDS=()

while IFS= read -r line; do
    PIDS+=("$line")
done < <(ps | grep -v grep | grep "$cmd" || true)

for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
done
pkill -f "$cmd" 2>/dev/null || true

# credits to https://github.com/eficode/wait-for/blob/master/wait-for

usage() {
    cat << USAGE
usage: $cmd host:port [-s] [-t timeout] [-- command args]
waits for tcp connection to host:port

options:
  -s, --strict               Only execute subcommand if the test succeeds
  -q, --quiet                Don't output any status messages
  -t TIMEOUT, --timeout=     Timeout in seconds, zero for no timeout
  -- COMMAND ARGS            Execute command with args after the test finishes
USAGE
}

wait_for() {
    local host=$1
    local port=$2
    local timeout=${3:-30}
    local quiet=${4:-false}

    if ! command -v nc >/dev/null; then
        echo "netcat (nc) is required for wait-for-it to function."
        exit 1
    fi

    if ! command -v timeout >/dev/null; then
        echo "timeout is required for wait-for-it to function."
        exit 1
    fi

    local i
    i=0
    while ! nc -z "$host" "$port" >/dev/null 2>&1; do
        i=$((i+1))
        if [ "$i" -gt "$timeout" ]; then
            if ! "$quiet"; then
                echo "timeout occurred after waiting $timeout seconds for $host:$port"
            fi
            return 1
        fi
        sleep 1
    done
    if ! "$quiet"; then
        echo "wait-for-it: $host:$port is available after $i seconds"
    fi
    return 0
}

quiet=false
if [[ "$QUIET" == "1" || "$QUIET" == "true" ]]; then
    quiet=true
fi

# Parse arguments
if [ "$1" == "--" ]; then
    shift
    command=("$@")
else
    command=()
fi

# Parse command line arguments
POSITIONAL=()
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--strict)
            STRICT=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
            quiet=true
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            if [ "$2" = "" ]; then
                echo "ERROR: --timeout requires an argument"
                exit 1
            fi
            shift 2
            ;;
        --)
            shift
            break
            ;;
        *)
            POSITIONAL+=("$1")
            shift
            ;;
    esac
done

# Restore positional parameters
set -- "${POSITIONAL[@]}" "${command[@]}"

# If provided an host:port, test it. Otherwise run the provided command.
if [[ "${POSITIONAL[0]}" =~ ":" ]]; then
    hostport=("${POSITIONAL[0]}")
    IFS=':' read -ra hostport_parsed <<< "$hostport"
    host="${hostport_parsed[0]}"
    port="${hostport_parsed[1]}"

    if [[ $# -gt 0 ]]; then
        if wait_for "$host" "$port" "${TIMEOUT:-30}" "$quiet"; then
            if [ "$STRICT" == "true" ]; then
                echo "Command executed because $host:$port is available"
                exec "$@"
            fi
        else
            if [ "$STRICT" == "true" ]; then
                exit 1
            fi
        fi
    else
        if wait_for "$host" "$port" "${TIMEOUT:-30}" "$quiet"; then
            exit 0
        else
            exit 1
        fi
    fi
else
    if [ $# -gt 0 ]; then
        exec "$@"
    else
        usage
        exit 1
    fi
fi