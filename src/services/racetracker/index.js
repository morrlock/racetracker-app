/** The TbsRt (TBS RaceTracker) class handles communication to a TBS RaceTracker device */
// RACETRACKER_SERVICE = 0000fff0-0000-1000-8000-00805f9b34fb (fff0) @ handle: 0x0023
// READ_CHARACTERISTIC = 0000fff2-0000-1000-8000-00805f9b34fb (fff2) @ handle: 0x0027
// WRITE_CHARACTERISTIC = 0000fff1-0000-1000-8000-00805f9b34fb (fff1) @ handle: 0x0024
// DEVICE_SERVICE = 0000180a-0000-1000-8000-00805f9b34fb (180a) @ handle: 0x0010
// FIRMWARE_CHARACTERISTIC = 00002a26-0000-1000-8000-00805f9b34fb (2a26) @ handle 0x0018

import _ from 'lodash';

import config from './config.json';

// regex expressions used to cleanup tracker responses
const RE_PERCENT = /(\d+.\d+)%/;
const RE_NUMBER = /\d+/g;
const RE_ALPHANUM = /[a-z0-9]+/i;
const RE_RACEUPDATE = /[PRT,]+/;

// regex replace arrays to convert channel prefixes: [user -> racetracker] ex. R3 -> C3
const R2C = ['R', /r+/i, 'C'];
const L2D = ['L', /l+/i, 'D'];
// regex replace arrays to convert channel prefixes: [racetracker -> user] ex. C3 -> R3
const C2R = ['C', /c+/i, 'R'];
const D2L = ['D', /d+/i, 'L'];
// regex replace function that uses to above arrays to fix channel prefixes
const RE_CHANNEL = (c, r) => (c.charAt(0) === r[0] ? c.replace(r[1], r[2]) : c);

export class TbsRt {
  constructor() {
    this._config = { ...config };
  }

  static get() {
    if (!TbsRt._instance) {
      TbsRt._instance = new TbsRt();
    }
    return TbsRt._instance;
  }

  /** Convert a command string to bytes for sending to RaceTracker */
  strToBytes(string) {
    let array = new Uint8Array(string.length);
    for (let i = 0, l = string.length; i < l; i++) {
      array[i] = string.charCodeAt(i);
    }
    return array.buffer;
  }

  /** Convert bytes from RaceTracker response to string */
  bytesToStr(buffer) {
    if (buffer === null) {
      return ''; // null buffer means empty string
    }
    let view = new DataView(buffer.slice(0)); // use a data view to look at the copy of the buffer
    let response = '';
    for (let i = 0; i < view.byteLength; i++) {
      //console.log('byte index: ', i , view.byteLength);
      let value = view.getUint8(i);
      if (value === 0) {
        // commands end with \0 aka just 0
        break;
      }
      response += String.fromCharCode(value);
      //console.log('value plus full response: (', value, ') ',response)
    }
    //console.log('bytesToString: ' + response);
    return response;
  }

  /** Lookup command, prepare any additional arguments and convert to bytes
  /*  key: the command lookup value in config.json
  /*  options: any additional parameters needed for the commands */
  prepareCommand(key, options) {
    return new Promise((resolve, reject) => {
      let cmd = this._config.commands[key];
      switch (key) {
        case 'setMinLapTime':
          cmd = cmd + ' ' + options.minLapTime;
          break;
        case 'setGateAdc':
          cmd = cmd + ' ' + options.gateADC;
          break;
        case 'getRacerChannel':
          cmd = cmd + ' ' + options.slot;
          break;
        case 'setRacerChannel':
          let chan = options.channel;
          chan = RE_CHANNEL(chan, R2C);
          chan = RE_CHANNEL(chan, L2D);
          cmd = cmd + ' ' + options.racer + ' ' + chan;
          break;
        case 'getTotalRounds':
          cmd = cmd + ' ' + options.racer;
          break;
        case 'getLapTime':
          cmd = cmd + ' ' + options.racer + ' ' + options.lap;
          break;
        case 'setMaxRounds':
          cmd = cmd + ' ' + options.maxRounds;
          break;
        default:
          break;
      }
      resolve(this.strToBytes(cmd));
    });
  }

  /** Convert RaceTracker response from bytes to string and do any additional formatting */
  /*  key: the command lookup value in config.json
  /*  result: raw text response from RaceTracker */
  prepareResponse(key, result) {
    return new Promise((resolve, reject) => {
      let response = this.bytesToStr(result);
      switch (key) {
        case 'getBatteryLevel':
          response = Math.round(response.match(RE_PERCENT)[1]);
          break;
        case 'getMinLapTime':
        case 'setMinLapTime':
        case 'getMaxRounds':
        case 'setMaxRounds':
        case 'getGateAdc':
        case 'setGateAdc':
        case 'getRssiAdc':
        case 'getTotalRounds':
          response = response.split(':')[1].match(RE_NUMBER)[0];
          break;
        case 'getActiveMode':
          response = response.split(':')[1].match(RE_NUMBER)[0];
          response = this._config.modes[response];
          break;
        case 'getRacerChannel':
        case 'setRacerChannel':
          response = response.split(':')[1].match(RE_ALPHANUM)[0];
          response = RE_CHANNEL(response, C2R);
          response = RE_CHANNEL(response, D2L);
          break;
        case 'startRaceShotgun':
        case 'startRaceFlyby':
          response = response.substring(0, 5).toUpperCase() === 'READY' ? true : false;
          break;
        case 'stopRace':
          response = response.substring(0, 4).toUpperCase() === 'IDLE' ? true : false;
          break;
        default:
          break;
      }
      resolve(response);
    });
  }

  // registerListener(deviceId) {
  //   window.ble.startNotification(deviceId, this._config.racetracker_service, this._config.read, data => {
  //     console.log('listener callback');
  //     console.log(this.bytesToStr(data));
  //   });
  // }

  /** Send a command to RaceTracker WRITE_CHARACTERISTIC */
  /*  cmd: raw command to send to RaceTracker */
  /*  deviceId: id of the RaceTracker to send to */
  writeCommand(cmd, deviceId) {
    return new Promise((resolve, reject) => {
      window.ble.write(
        deviceId,
        this._config.racetracker_service,
        this._config.write,
        cmd,
        data => resolve(data),
        error => reject(error)
      );
    });
  }

  /** Read result of a command sent to a RaceTracker at READ_CHARACTERISTIC */
  /*  deviceId: id of the racetracker to read result from */
  readCommand(deviceId) {
    return new Promise((resolve, reject) => {
      window.ble.read(
        deviceId,
        this._config.racetracker_service,
        this._config.read,
        data => resolve(data),
        error => reject(error)
      );
    });
  }

  /** Read result of a command sent to a RaceTracker on an interval */
  /*  deviceId: id of the racetracker to read result from */
  /*  interval: interval to check result in ms */
  /*  complete: function that determines if the command has completed */
  readCommandAtInterval(deviceId, interval, complete) {
    return new Promise((resolve, reject) => {
      let intId = setInterval(() => {
        window.ble.read(
          deviceId,
          this._config.racetracker_service,
          this._config.read,
          data => {
            data = this.bytesToStr(data);
            if (complete(data)) {
              clearInterval(intId);
              resolve();
            }
          },
          error => {
            clearInterval(intId);
            reject(error);
          }
        );
      }, interval);
    });
  }

  /** Get the firmware version on a RaceTracker by device id */
  readFirmwareVersion(cb, deviceId) {
    window.ble.read(
      deviceId,
      this._config.device_service,
      this._config.firmware,
      response => cb({ deviceId: deviceId, firmware: this.bytesToStr(response) }),
      error => cb({ error: error })
    );
  }

  /** Get the active mode of a RaceTracker by device id */
  readActiveMode(cb, deviceId) {
    let cmdStr = 'getActiveMode';
    this.prepareCommand(cmdStr)
      .then(cmd =>
        this.writeCommand(cmd, deviceId).then(
          this.readCommand(deviceId).then(result => {
            this.prepareResponse(cmdStr, result).then(response => cb({ deviceId: deviceId, activeMode: response }));
          })
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Get the battery level of a RaceTracker by device id */
  readBatteryLevel(cb, deviceId) {
    let cmdStr = 'getBatteryLevel';
    this.prepareCommand(cmdStr)
      .then(cmd =>
        this.writeCommand(cmd, deviceId).then(
          this.readCommand(deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(response => cb({ deviceId: deviceId, battery: response }))
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Fetch the total amount of rounds a racer has completed */
  readTotalRounds(cb, request) {
    let cmdStr = 'getTotalRounds';
    this.prepareCommand(cmdStr, request)
      .then(cmd =>
        this.writeCommand(cmd, request.deviceId).then(
          this.readCommand(request.deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(
              response => console.log(response) // numeric value 0
              // cb({ deviceId: request.deviceId, totalRounds: response })
            )
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Get the laptime of a round by a specific racer */
  readLapTime(cb, request) {
    let cmdStr = 'getLapTime';
    this.prepareCommand(cmdStr, request)
      .then(cmd =>
        this.writeCommand(cmd, request.deviceId).then(
          this.readCommand(request.deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(
              response => console.log(response)
              // cb({ deviceId: request.deviceId, round: request.round, lapTime: response })
            )
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Get the latest lap update of an active race heat */
  readRaceUpdate(cb, request) {
    this.readCommand(request.deviceId)
      .then(result =>
        this.prepareResponse('getRaceUpdate', result).then(response => {
          if (response.startsWith('STARTED')) {
            // occurs when in flyovermode and the first pilot passes the gate
            cb({
              start: true
            });
          }
          if (!response.startsWith('READY') && !response.startsWith('STARTED')) {
            let arr = response.split(RE_RACEUPDATE);
            // there are 2 different responses depending on a single racer or more
            if (arr.length === 4) {
              cb({
                racer: 1,
                lap: Number(arr[1]),
                lapTime: arr[2],
                totalTime: arr[3].match(RE_NUMBER)[0],
                heatId: request.heatId
              });
            } else {
              cb({
                racer: Number(arr[1]),
                lap: Number(arr[2]),
                lapTime: arr[3],
                totalTime: arr[4].match(RE_NUMBER)[0],
                heatId: request.heatId
              });
            }
          }
        })
      )
      .catch(error => cb({ error: error }));
  }

  /** Get the maximum allowed number of rounds allowed */
  readMaxRounds(cb, deviceId) {
    let cmdStr = 'getMaxRounds';
    this.prepareCommand(cmdStr)
      .then(cmd =>
        this.writeCommand(cmd, deviceId).then(
          this.readCommand(deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(response => cb({ deviceId: deviceId, maxRounds: response }))
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Set the value for the maximum number of rounds allowed */
  writeMaxRounds(cb, request) {
    let cmdStr = 'setMaxRounds';
    this.prepareCommand(cmdStr, request)
      .then(cmd =>
        this.writeCommand(cmd, request.deviceId).then(
          this.readCommand(request.deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(response =>
              cb({ deviceId: request.deviceId, maxRounds: response })
            )
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Get the current RSSI value of the ADC */
  readRssiAdc(cb, deviceId) {
    let cmdStr = 'getRssiAdc';
    this.prepareCommand(cmdStr)
      .then(cmd =>
        this.writeCommand(cmd, deviceId).then(
          this.readCommand(deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(response => cb({ deviceId: deviceId, rssiADC: response }))
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Read all channels from available racer slots (used on initial set) */
  readRacerChannels(cb, deviceId) {
    //this.registerListener(deviceId);

    var racerPromises = [
      this.getRacerChannelPromise({ deviceId: deviceId, racer: 1 }),
      this.getRacerChannelPromise({ deviceId: deviceId, racer: 2 }),
      this.getRacerChannelPromise({ deviceId: deviceId, racer: 3 }),
      this.getRacerChannelPromise({ deviceId: deviceId, racer: 4 }),
      this.getRacerChannelPromise({ deviceId: deviceId, racer: 5 }),
      this.getRacerChannelPromise({ deviceId: deviceId, racer: 6 }),
      this.getRacerChannelPromise({ deviceId: deviceId, racer: 7 }),
      this.getRacerChannelPromise({ deviceId: deviceId, racer: 8 })
    ];
    Promise.all(racerPromises)
      .then(response => cb({ deviceId: deviceId, channels: response.filter(Boolean) }))
      .catch(error => cb(error));
  }

  getRacerChannelPromise(request) {
    return new Promise((resolve, reject) => {
      let cmdStr = 'getRacerChannel';
      let slot = this._config.slots[request.racer]; // get the handle of the racer slot
      this.prepareCommand(cmdStr, { slot: slot })
        .then(cmd =>
          this.writeCommand(cmd, request.deviceId).then(
            this.readCommand(request.deviceId).then(result =>
              this.prepareResponse(cmdStr, result).then(response => {
                if (response !== 'FF') {
                  resolve({ racer: request.racer, channel: response });
                } else {
                  resolve(null);
                }
              })
            )
          )
        )
        .catch(error => reject({ error: error }));
    });
  }

  /** Get the channel info for an individual racer slot */
  readRacerChannel(cb, request) {
    let cmdStr = 'getRacerChannel';
    let slot = this._config.slots[request.racer]; // get the handle of the racer slot
    this.prepareCommand(cmdStr, { slot: slot })
      .then(cmd =>
        this.writeCommand(cmd, request.deviceId).then(
          this.readCommand(request.deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(response => {
              cb({ deviceId: request.deviceId, channel: { racer: request.racer, channel: response } });
            })
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Write all channels to racetracker */
  writeRacerChannels(cb, request) {
    let racerPromises = [];
    for (let channel of request.channels) {
      racerPromises.push(this.setRacerChannelPromise({ deviceId: request.deviceId, channel: channel }));
    }
    Promise.all(racerPromises)
      .then(response => cb({ deviceId: request.deviceId, channels: _.pull(response, null) }))
      .catch(error => cb(error));
  }

  /* Set the channel of a specified racer slot, empty values or 'FF' indicate array removal */
  setRacerChannelPromise(request) {
    return new Promise((resolve, reject) => {
      let cmdStr = 'setRacerChannel';
      this.prepareCommand(cmdStr, { racer: request.channel.racer, channel: request.channel.channel.toUpperCase() })
        .then(cmd =>
          this.writeCommand(cmd, request.deviceId).then(
            this.readCommand(request.deviceId).then(result =>
              this.prepareResponse(cmdStr, result).then(response => {
                if (response !== 'FF') {
                  resolve({ racer: request.channel.racer, channel: response });
                } else {
                  resolve(null);
                }
              })
            )
          )
        )
        .catch(error => reject({ error: error }));
    });
  }

  /* Set the channel of a specified racer slot, empty values or 'FF' indicate array removal */
  writeRacerChannel(cb, request) {
    let cmdStr = 'setRacerChannel';
    this.prepareCommand(cmdStr, { racer: request.racer, channel: request.channel })
      .then(cmd =>
        this.writeCommand(cmd, request.deviceId).then(
          this.readCommand(request.deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(response => {
              cb({ deviceId: request.deviceId, channel: { racer: request.racer, channel: response } });
            })
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Get the minimum lap time of a RaceTracker by device id */
  readMinLapTime(cb, deviceId) {
    let cmdStr = 'getMinLapTime';
    this.prepareCommand(cmdStr)
      .then(cmd =>
        this.writeCommand(cmd, deviceId).then(
          this.readCommand(deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(response => cb({ deviceId: deviceId, minLapTime: response }))
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Set the minimum lap time of a RaceTracker by device id */
  writeMinLapTime(cb, request) {
    let cmdStr = 'setMinLapTime';
    this.prepareCommand(cmdStr, request)
      .then(cmd =>
        this.writeCommand(cmd, request.deviceId).then(
          this.readCommand(request.deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(response =>
              cb({ deviceId: request.deviceId, minLapTime: response })
            )
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Get the Gate calibration value of a RaceTracker by device id */
  readGateAdc(cb, deviceId) {
    let cmdStr = 'getGateAdc';
    this.prepareCommand(cmdStr)
      .then(cmd =>
        this.writeCommand(cmd, deviceId).then(
          this.readCommand(deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(response => cb({ deviceId: deviceId, gateADC: response }))
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Set the Gate calibration value of a RaceTracker by device id */
  writeGateAdc(cb, request) {
    let cmdStr = 'setGateAdc';
    this.prepareCommand(cmdStr, request)
      .then(cmd =>
        this.writeCommand(cmd, request.deviceId).then(
          this.readCommand(request.deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(response =>
              cb({ deviceId: request.deviceId, gateADC: response.gateADC })
            )
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** End the currently running race heat */
  stopHeat(cb, request) {
    let cmdStr = 'stopRace';
    this.prepareCommand(cmdStr)
      .then(cmd =>
        this.writeCommand(cmd, request.deviceId).then(
          this.readCommand(request.deviceId).then(result =>
            this.prepareResponse(cmdStr, result).then(response =>
              cb({ deviceId: request.deviceId, heatId: request.heatId, heatStopped: response })
            )
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /* Start a race heat according to start style, device id, and heat id */
  startHeat(cb, request) {
    let vrxStr = 'activateVrx'; // enables the vrx for race tracking
    let cmdStr = request.raceMode === 'shotgun' ? 'startRaceShotgun' : 'startRaceFlyby'; // race start type
    this.prepareCommand(vrxStr, request)
      .then(vrx =>
        this.writeCommand(vrx, request.deviceId).then(
          this.prepareCommand(cmdStr, request).then(cmd =>
            this.writeCommand(cmd, request.deviceId).then(
              this.readCommand(request.deviceId).then(result =>
                this.prepareResponse(cmdStr, result).then(response =>
                  cb({ deviceId: request.deviceId, heatId: request.heatId, heatStarted: response })
                )
              )
            )
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** Perform a gate calibration for a RaceTracker by device id */
  calibrateGate(cb, deviceId) {
    let cmdStr = 'calibrateGate';
    this.prepareCommand(cmdStr, deviceId)
      .then(cmd =>
        this.writeCommand(cmd, deviceId).then(
          this.readCommandAtInterval(deviceId, 1000, this.isCalibrationComplete).then(() =>
            this.readGateAdc(cb, deviceId)
          )
        )
      )
      .catch(error => cb({ error: error }));
  }

  /** validation function to determine when the calibration process has completed */
  isCalibrationComplete(data: string) {
    let matchStr = 'Calibrated';
    if (data.substring(0, 10) === matchStr) {
      return true;
    }
    return false;
  }

  /** Generic raw sending function for development/debug purposes */
  sendRawCommand(raw_command, deviceId) {
    let cmd = this.strToBytes(raw_command);
    this.writeCommand(cmd, deviceId)
      .then(
        this.readCommand(deviceId).then(result => {
          console.log('--sendRawCommandResponse--');
          let response = this.bytesToStr(result);
          console.log(response);
          // do any optional work now
          // ex. response.match(RE_PERCENT);
        })
      )
      .catch(error => {
        console.log('--sendRawCommandError--');
        console.log(error);
      });
  }
}

export default TbsRt.get();
