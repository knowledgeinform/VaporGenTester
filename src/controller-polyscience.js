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
const ad = require('./abstract-driver.js')
const ui = require('./ui.js')
const db = require('./database.js')
const bkup = require('./backup.js')
const superagent = require('superagent')

class Polyscience extends EventEmitter {
  constructor({address = '192.12.3.145', testFlag = false, password = 'password', polySciPath, topObj}) {
    // testFlag = false
    super()
    this.testFlag = testFlag
    this.address = address
    this.password = password
    this.units = 'C'
    this.property = {
      PV: new ad.DataPoint({value: -1, units: this.units}),
      SP: new ad.DataPoint({value: -1, units: this.units}),
      CO: new ad.DataPoint({value: -1, units: '%'}),
    }
    Object.defineProperty(this, 'PV', {
      enumerable: true,
      get: () => {
        var command = 'RT'
        // var res
        try {
          this.sendCommand(command)
          .then(res => {
            this.property.PV.time = Date.now()
            this.property.PV.value = parseFloat(res.text)
          })
          .catch(error => {
            console.log(command + ' error')
            console.log(error)
          })
        } catch (error) {
          console.log(command + ' error')
          console.log(error)
        }
        return this.property.PV
      },
    })
    Object.defineProperty(this, 'SP', {
      enumerable: true,
      get: () => {
        var command = 'RS'
        this.sendCommand(command)
        .then(res => {
          this.property.SP.time = Date.now()
          this.property.SP.value = parseFloat(res.text)
        })
        .catch(error => {
          console.log(command + ' error')
          console.log(error)
        })
        return this.property.SP
      },
      set: val => {
        this.property.SP.time = Date.now()
        this.property.SP.value = val
        console.log('Sending password')
        var command = 'SRL' + this.password + '?'
        this.sendCommand(command)
        .then(res => {
          console.log('password response')
          console.log(res)
          // probably should be checking for !
          console.log('Sending set point')
          command = 'SS' + val.toFixed(3)
          console.log('Command')
          console.log(command)
          this.sendCommand(command)
          .then(res => {
            console.log('response')
            console.log(res)
            // probably should be checking for !
            console.log('Sending set point')
            command = 'SS' + val.toFixed(3)
            console.log('Command')
            console.log(command)
            this.sendCommand(command)
            .then(res => {
              console.log('response')
              console.log(res)
              // probably should be checking for !
            })
            .catch(error => {
              console.log(command + ' error')
              console.log(error)
            })
          })
          .catch(error => {
            console.log(command + ' error')
            console.log(error)
          })
        })
        .catch(error => {
          console.log(command + ' error')
          console.log(error)
        })
      },
    })

    // Database needs
    this.polySciPath = polySciPath
    this.obj = topObj

    this.AdditionalFields = {}
    this.AdditionalFields.Database = new ui.ShowUser({
      value: [{
        id: 'Settings',
        obj: {0: new db.GUI({
          measurementName: 'polysci_basic',
          fields: ['SP',
            'PV'],
          obj: this,
          testFlag: this.testFlag,
          objPath: this.polySciPath,
        })},
        path: this.polySciPath + '/' + db.path + '/' + bkup.fileName(this) + '.json',
      }],
      type: ['output', 'link'],
    })
  }

  get CO() {
    return this.property.CO
  }

  sendCommand(command) {
    var sendValue = '/cgi-bin/CgiSend.cgi?timestamp=' + new Date().getTime()
    var sendCommand
    if (command.includes('SRL')) {
      sendValue = '/cgi-bin/passSend.cgi?timestamp=' + new Date().getTime()
      sendCommand = command
    } else {
      sendCommand = command + '\r'
    }
    return new Promise((resolve, reject) => {
      superagent
      .post(this.address + sendValue) // --> 192.12.3.145/cgi-bin/...
      .timeout({response: 3000})
      .send(sendCommand)
      .then(res => {
        this.emit('res', res)
        // console.log(res.text)
        return resolve(res)
      })
      .catch(error => {
        console.log('Polyscience ERROR!!!! Command: ' + command)
        console.log(this.address)
        console.log(error)
        return reject(error)
      })
    })
  }

  initialize() {

  }
}

module.exports = {
  Device: Polyscience,
}

// var sendValue = '/cgi-bin/CgiSend.cgi?' + 'timestamp=' + new Date().getTime()
// var address = '192.12.3.145'
//
// superagent
// .post(address+sendValue) // --> 192.12.3.145/cgi-bin/...
// .timeout({response: 3000})
// .send('SS30.00' + '\r')
// .then((res) => {
//   console.log(res.text) // this should probably be an !
// })
// .catch((e) => {
//   console.log('ERROR!!!!')
//   console.error(e)
//   if (e.status == 504) {
//     alert('Connection to the unit timed out.')
//     this.timeouts = true
//   }
// })
