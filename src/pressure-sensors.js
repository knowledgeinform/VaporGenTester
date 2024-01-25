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

const ui = require('./ui.js')
const bkup = require('./backup.js')
// const pressureMKS = require('./pressure-mks.js')
const pressureADS = require('./pressure.js')
const db = require('./database.js')
// const controlSystemWatlow = require('./controlSystem-watlow.js')

var pressureSensorID = 'Pressure Sensors'
var pressureSensorPath = 'config/' + pressureSensorID

class PressureSensorC {
  constructor({
    // router = null,
    Description,
    Details,
    testFlag = true,
    // controlSystem,
    type,
    thisPressureSensorPath,
  }) {
    this.Type = new ui.ShowUser({value: type})
    if (type === 'ADS') {
      Object.defineProperty(this, 'hidden', {
        value: new pressureADS.Device({testFlag: testFlag}),
      })
    } else {
      console.log('UNKNOWN pressure sensor type:')
      console.log(type)
    }

    if (this.hidden.continuous) {
      this.Pressure = new ui.ShowUser({value: this.hidden.pressure, type: ['input', 'datapoint']})
      this.hidden.on('data', () => {
        this.Pressure.value = this.hidden.pressure
      })
      Object.defineProperty(this, 'Reconnect', {
        enumerable: true,
        get: () => {
          return (new ui.ShowUser({value: new ui.Action({name: 'post', data: this.State}), type: ['output', 'button']}))
        },
        set: ({res}) => {
          this.hidden.initialize()
          res.json(this.Reconnect)
        },
      })
    }
    this.Description = new ui.ShowUser({value: Description})
    this.Details = new ui.ShowUser({value: Details})
    Object.defineProperty(this, 'testFlag', {
      writable: true,
      value: testFlag,
    })
    this.datastreams = {refreshRate: 1000}
    this.updateable = []
    this.nonupdateable = ['Type']
    this.Database = new ui.ShowUser({
      value: [{
        id: 'Settings',
        obj: {0: new db.GUI({
          measurementName: 'pressure_basic',
          fields: [
            'Pressure',
          ],
          tags: ['Type'],
          obj: this,
          testFlag: this.testFlag,
          objPath: thisPressureSensorPath,
        })},
        path: thisPressureSensorPath + '/' + db.path + '/' + bkup.fileName(this) + '.json',
      }],
      type: ['output', 'link'],
    })
  }
}

var pressureSensorMap = {ADS: {type: {value: 'ADS'}, Description: {value: ''}, Details: {value: ''}}}

function selectRouter({controlSystem, test}) {
  var router
  if (controlSystem === 'watlow') {
    console.log(test)
    // router = controlSystemWatlow.Router({path: '/dev/ttyUSB0', test: test, baud: 9600})
  } else {
    console.log('UNKNOWN Control System! :')
    console.log(controlSystem)
  }

  return router
}

module.exports = {
  initialize: function (test) {
    console.log('intializing pressure sensors')

    if (bkup.configExists(pressureSensorPath)) {
      // this should eventually be in a try-catch with a default config
      var loadMap = bkup.load(pressureSensorPath)
      Object.entries(loadMap).forEach(([key, value]) => {
        // specify bare-minimum amount that the config should have
        if (value.type.value === undefined) {
          // did not have bare minimum so fail out loudly
          console.log('Configuration missing critical component(s):')
          console.log('value.controlSystem.value OR value.type.value')
          console.log(value)
        } else {
          console.log(key)
          console.log(value)
          if (value.controlSystem === undefined) {
            pressureSensorMap[key] = new PressureSensorC({Description: value.Description.value,
              Details: value.Details.value,
              testFlag: test,
              type: value.type.value,
              thisPressureSensorPath: pressureSensorPath,
            })
          } else {
            var router = selectRouter({
              controlSystem: value.controlSystem.value,
              test: test,
            })
            pressureSensorMap[key] = new PressureSensorC({
              router: router,
              Description: value.Description.value,
              Details: value.Details.value,
              testFlag: test,
              controlSystem: value.controlSystem.value,
              type: value.type.value,
              thisPressureSensorPath: pressureSensorPath,
            })
          }
          // pressureSensorMap[key] = new MFC({id: value.ID.value,router: router, testFlag: test,Description: value.Description.value,Details: value.Details.value})
        }
      })
    } else {
      // add details to valve map
      Object.entries(pressureSensorMap).forEach(([key, value]) => {
        console.log(value)
        if (value.controlSystem === undefined) {
          pressureSensorMap[key] = new PressureSensorC({
            Description: value.Description.value,
            Details: value.Details.value,
            testFlag: test,
            type: value.type.value,
            thisPressureSensorPath: pressureSensorPath,
          })
        } else {
          var router = selectRouter({
            controlSystem: value.controlSystem.value,
            test: test,
          })
          pressureSensorMap[key] = new PressureSensorC({
            router: router,
            Description: value.Description.value,
            Details: value.Details.value,
            testFlag: test,
            controlSystem: value.controlSystem.value,
            type: value.type.value,
            thisPressureSensorPath: pressureSensorPath,
          })
        }
        console.log(pressureSensorMap[key])
        bkup.save(value, pressureSensorPath)
      })
    }
  },
  id: pressureSensorID,
  obj: pressureSensorMap,
  path: pressureSensorPath,
}
