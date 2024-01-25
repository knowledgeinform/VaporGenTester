/// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2019 The Johns Hopkins University Applied Physics Laboratory LLC (JHU/APL).  All Rights Reserved.
//
// This material may be only be used, modified, or reproduced by or for the U.S. Government pursuant to the license
// rights granted under the clauses at DFARS 252.227-7013/7014 or FAR 52.227-14. For any other permission, please
// contact the Office of Technology Transfer at JHU/APL: Telephone: 443-778-2792, Internet: www.jhuapl.edu/ott
//
// NO WARRANTY, NO LIABILITY. THIS MATERIAL IS PROVIDED 'AS IS.' JHU/APL MAKES NO REPRESENTATION OR WARRANTY WITH
// RESPECT TO THE PERFORMANCE OF THE MATERIALS, INCLUDING THEIR SAFETY, EFFECTIVENESS, OR COMMERCIAL VIABILITY, AND
// DISCLAIMS ALL WARRANTIES IN THE MATERIAL, WHETHER EXPRESS OR IMPLIED, INCLUDING (BUT NOT LIMITED TO) ANY AND ALL
// IMPLIED WARRANTIES OF PERFORMANCE, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT OF
// INTELLECTUAL PROPERTY OR OTHER THIRD PARTY RIGHTS. ANY USER OF THE MATERIAL ASSUMES THE ENTIRE RISK AND LIABILITY
// FOR USING THE MATERIAL. IN NO EVENT SHALL JHU/APL BE LIABLE TO ANY USER OF THE MATERIAL FOR ANY ACTUAL, INDIRECT,
// CONSEQUENTIAL, SPECIAL OR OTHER DAMAGES ARISING FROM THE USE OF, OR INABILITY TO USE, THE MATERIAL, INCLUDING,
// BUT NOT LIMITED TO, ANY DAMAGES FOR LOST PROFITS.
/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const EventEmitter = require('events')
const ModbusRTU = require('modbus-serial')
const ad = require('./abstract-driver.js')
const ui = require('./ui.js')
const db = require('./database.js')
const bkup = require('./backup.js')
const rpio = require('rpio')

ModbusRTU.prototype.register = function (callback) {
  var modbus = this
  modbus._timeout = 1000 // set here since it's actually set in the promisification script, which no longer gets run
  modbus._port._transactionIdRead = 1
  modbus._port._transactionIdWrite = 1

  /* On serial port success
   * (re-)register the modbus parser functions
   */
  modbus._port.removeListener('data', modbus._onReceive)
  modbus._port.on('data', modbus._onReceive)

  /* Hook the close event so we can relay it to our callers. */
  modbus._port.once('close', modbus.emit.bind(modbus, 'close'))
  console.log('mb register')
  console.log(this)

  return callback
}

class CarboliteC extends EventEmitter {
  constructor({testFlag = false, router, id = 1, minWait = 300, carbolitePath}) {
    super()
    this.id = id
    this.ID = new ui.ShowUser({value: 'Carbolite' + id.toString()})
    this.client = new ModbusRTU(router.port)
    this.client.setID(this.id)
    this.testFlag = testFlag
    this.carbolitePath = carbolitePath

    // Necessary serial line waits
    this.awaitingResponse = false
    this.lastResponseTime = Date.now()
    this.minWait = minWait // minimum amount of time (ms) to wait before next serial line call
    this.last6675ReadTime = Date.now()
    this.min6675Wait = 220 // minimum amount of time (ms) to wait before reading the max6675 again (any sooner and conversions will cancel)

    // important properties for controllers.js
    this.numberPVs = 2
    this.numberSPs = 1
    this.property = {
      SP0: new ad.DataPoint({units: '%'}),
      PV0: new ad.DataPoint({units: 'C'}),
      CO0: new ad.DataPoint({units: '%'}),
      PV1: new ad.DataPoint({units: 'C'}),
    }
    this.router = router
    this.AdditionalFields = {Enable: new ui.ShowUser({value: false, type: ['output', 'binary']})}
    if (this.carbolitePath !== undefined) {
      this.AdditionalFields.Database = new ui.ShowUser({
        value: [{
          id: 'Settings',
          obj: {0: new db.GUI({
            measurementName: 'carbolite_basic',
            fields: ['SP0',
              'PV0',
              'CO0',
              'PV1'],
            obj: this,
            testFlag: this.testFlag,
            objPath: this.carbolitePath,
          })},
          path: this.carbolitePath + '/' + db.path + '/' + bkup.fileName(this) + '.json',
        }],
        type: ['output', 'link'],
      })
    }
    // this.serialControl = new ad.SerialControl({router: this.router, testFlag: testFlag, timeout: 200, debugTest: false, interMessageWait: 175})
  }

  set SP0(val) {
    if (!this.awaitingResponse && Date.now() - this.lastResponseTime >= this.minWait && !this.testFlag) {
      if (this.AdditionalFields.Enable.value) {
        this.setCO0(val)
      }
    }
  }

  get SP0() {
    if (!this.awaitingResponse && Date.now() - this.lastResponseTime >= this.minWait && !this.testFlag) {
      this.getCO0()
    }
    return this.property.CO0 // the set point is the controller output for now
  }

  getPV0() {
    console.log('Reading PV0')
    this.awaitingResponse = true
    this.client.readHoldingRegisters(1, 1).then(resp => {
      this.awaitingResponse = false
      this.lastResponseTime = Date.now()
      console.log('get PV0 resp')
      console.log(resp)
      if (resp !== undefined) {
        this.property.PV0.value = resp.data[0]
        this.property.PV0.time = Date.now()
      }
    }).catch(error => {
      console.log('Carbolite error: get PV0')
      console.log(error)
    })
  }

  get PV0() {
    if (!this.awaitingResponse && Date.now() - this.lastResponseTime >= this.minWait && !this.testFlag) {
      this.getPV0()
    }
    return this.property.PV0
  }

  getCO0() {
    console.log('Reading get CO0')
    this.awaitingResponse = true
    this.client.readHoldingRegisters(3, 1).then(resp => {
      this.awaitingResponse = false
      this.lastResponseTime = Date.now()
      console.log('get CO0 resp')
      console.log(resp)
      if (resp !== undefined) {
        this.property.CO0.value = resp.data[0]
        this.property.CO0.time = Date.now()
      }
    }).catch(error => {
      console.log('Carbolite error: get CO0')
      console.log(error)
    })
  }

  setCO0(val) {
    if (val > 100) {
      val = 100
    } else if (val < 0) {
      val = 0
    } else {
      // do nothing
    }
    console.log('Writing set CO0')
    this.awaitingResponse = true
    this.client.writeRegisters(3, [val]).then(resp => {
      this.awaitingResponse = false
      this.lastResponseTime = Date.now()
      console.log('set CO0 resp')
      console.log(resp)
      if (resp !== undefined) {
        this.property.CO0.value = val
        this.property.CO0.time = Date.now()
      }
    }).catch(error => {
      console.log('Carbolite error: set CO0')
      console.log(error)
    })
  }

  get CO0() {
    if (!this.awaitingResponse && Date.now() - this.lastResponseTime >= this.minWait && !this.testFlag) {
      this.getCO0()
    }
    return this.property.CO0
  }

  async getPV1() {
    if (Date.now() - this.last6675ReadTime >= this.min6675Wait && !this.testFlag) {
      this.readMax6675Temperature()
    }
  }

  get PV1() {
    this.getPV1().catch(error => {
      console.log('Carbolite get PV1 error')
      console.log(error)
    })
    return this.property.PV1
  }

  max6675initialize() {
    rpio.spiBegin()
    rpio.spiChipSelect(0)                  /* Use CE0, pin 24 */
    // rpio.spiSetCSPolarity(0, rpio.HIGH)    /* AT93C46 chip select is active-high */
    rpio.spiSetClockDivider(1028)           /* MAX6675 max is 4.3 MHz, but very noisy environment so, 1028 === 243 kHz */
    rpio.spiSetDataMode(1)                 /* MAX6675 datasheet says to read on falling edge of clock */
  }

  readMax6675Temperature() {
    var tx = Buffer.from([0x00])
    var rx = Buffer.alloc(2)
    rpio.spiTransfer(tx, rx, 4)
    this.property.PV1.time = Date.now()
    // console.log('rx')
    // console.log(rx)
    rx[1] = (rx[0] << 5) | (rx[1] >> 3)
    rx[0] >>= 3
    // console.log(rx)
    var out = (rx.readUInt16BE(0) * 0.25)
    this.property.PV1.value = out
  }

  initialize() {
    if (!this.testFlag) {
      this.max6675initialize()
      this.client.register()
      this.emit('initialized')
    }
  }
}

module.exports = {
  Device: CarboliteC,
}

// var tx = Buffer.from([0x00])
// var rx = Buffer.alloc(2)
//
// var out
// var i = 0, j = 0
// function f() {
//   i = i + 1
//   rpio.spiTransfer(tx, rx, 4)
//   console.log('rx')
//   console.log(rx)
//   rx[1] = (rx[0] << 5) | (rx[1] >> 3)
//   rx[0] = rx[0] >> 3
//   console.log(rx)
//   out = (rx.readUInt16BE(0)*0.25)
//   console.log('out')
//   console.log(out)
//   console.log('Switch statement')
//   if (true) {
//     console.log('repeating')
//     setTimeout(() => {
//       console.log('Executing')
//       f()
//     },500)
//   } else {
//     console.log('Done')
//     console.log(i)
//     rpio.spiEnd()
//   }
//
// }
// f()

function readCarbo(r) {
  console.log('Router open')
  var cc = new CarboliteC({router: r, id: 1})
  cc.once('initialized', () => {
    setInterval(() => {
      // cc.SP0 = 50
      setTimeout(() => {
        console.log('Result')
        console.log(cc.PV0)
      }, 500)

      // var tmp = oz.flow
    }, 3000)
  })
  cc.initialize()
}

console.log('Waiting 4 s for serial line device')
setTimeout(() => {
  var r = new ad.Router({portPath: '/dev/ttyUSB2',
    baud: 9600,
    testFlag: false,
    timing: true,
    manufacturer: 'Prolific Technology Inc.',
    vmin: 5,
    vtime: 0,
  })
  if (r.open) {
    readCarbo(r)
  } else {
    r.once('open', () => {
      readCarbo(r)
    })
  }
}, 4000)
