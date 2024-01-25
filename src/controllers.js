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
const watlowCtrlr = require('./controller-watlow.js')
const humidityCtrlr = require('./humidity-driver.js')
const polysciCtrlr = require('./controller-polyscience.js')
const ad = require('./abstract-driver.js')

var controllersID = 'Controllers'
var controllersPath = 'config/' + controllersID

function isSetter(obj, prop) {
  return Boolean(Object.getOwnPropertyDescriptor(obj, prop).set)
}

class ControllersC {
  constructor({router, Description, Details, testFlag = true, type, index, services, serverInstance}) {
    var i
    this.Index = new ui.ShowUser({value: index})
    this['Controller Type'] = new ui.ShowUser({value: type})
    Object.defineProperty(this, 'testFlag', {
      writable: true,
      value: testFlag,
    })
    // controller specific code
    if (type === 'watlow') {
      Object.defineProperty(this, 'hidden', {
        value: new watlowCtrlr.Device({router: router, testFlag: testFlag}),
      })
    } else if (type === 'Humidity Driver') {
      Object.defineProperty(this, 'hidden', {
        value: new humidityCtrlr.Device({testFlag: testFlag, services, serverInstance: serverInstance, humidityDriverPath: controllersPath, router: router}),
      })
    } else if (type === 'polyscience') {
      Object.defineProperty(this, 'hidden', {
        value: new polysciCtrlr.Device({address: router, testFlag: testFlag, polySciPath: controllersPath, topObj: this}),
      })
    } else {
      console.log('UNKNOWN controller type:')
      console.log(type)
    }
    // console.log(this.hidden.hidden.processValue)
    // generic controller code
    this.datastreams = {refreshRate: 1000}
    this.updateable = []
    if (this.hidden.numberPVs === undefined) {
      Object.defineProperty(this, 'Process Value', {
        enumerable: true,
        get: () => {
          return new ui.ShowUser({value: this.hidden.PV, type: ['input', 'datapoint']})
        },
      })
    } else {
      var descriptor = []
      var name = []
      for (i = 0; i < this.hidden.numberPVs; i++) {
        name.push('PV' + i.toString())
        descriptor.push('Process Value ' + i.toString())
      }
      descriptor.forEach((d, i) => {
        Object.defineProperty(this, d, {
          enumerable: true,
          get: () => {
            // console.log('Getting PV '+i)
            return (new ui.ShowUser({value: this.hidden[name[i]], type: ['input', 'datapoint']}))
          },
        })
      })
    }

    if (this.hidden.numberSPs === undefined) {
      Object.defineProperty(this, 'Set Point', {
        enumerable: true,
        get: () => {
          return new ui.ShowUser({value: this.hidden.SP, type: ['output', 'datapoint']})
        },
        set: val => {
          this.hidden.SP = val
        },
      })
      // this.updateable.push('Set Point')
      Object.defineProperty(this, 'Controller Output', {
        enumerable: true,
        get: () => {
          return new ui.ShowUser({value: this.hidden.CO, type: ['input', 'datapoint']})
        },
        // set: val => {
        //   // might allow user to manually control an output
        // },
      })
      // Object.defineProperty(this, 'Set Point', {
      //   enumerable: true,
      //   get: () => {
      //     return (new ui.ShowUser({value: this.hidden.setPoint, type: ['output', 'datapoint']}))
      //   }
      // })
    } else {
      var spdescriptor = []
      var spname = []
      var codescriptor = []
      var coname = []
      for (i = 0; i < this.hidden.numberSPs; i++) {
        spname.push('SP' + i.toString())
        spdescriptor.push('Set Point ' + i.toString())
        coname.push('CO' + i.toString())
        codescriptor.push('Controller Output ' + i.toString())
      }
      spdescriptor.forEach((d, i) => {
        Object.defineProperty(this, d, {
          enumerable: true,
          get: () => {
            return (new ui.ShowUser({value: this.hidden[spname[i]], type: ['output', 'datapoint']}))
          },
          set: val => {
            console.log('Setting sp: ' + val)
            this.hidden[spname[i]] = val
          },
        })
        // this.updateable.push(d)
      })
      codescriptor.forEach((d, i) => {
        Object.defineProperty(this, d, {
          enumerable: true,
          get: () => {
            return (new ui.ShowUser({value: this.hidden[coname[i]], type: ['input', 'datapoint']}))
          },
        })
      })
    }

    if (Object.prototype.hasOwnProperty.call(this.hidden, 'Settings')) {
      console.log('Found Settings')
      this.Settings = this.hidden.Settings
    }
    this.checkAdditionalFields()

    this.Description = new ui.ShowUser({value: Description})
    this.Details = new ui.ShowUser({value: Details})
  }

  checkAdditionalFields() {
    if (Object.prototype.hasOwnProperty.call(this.hidden, 'AdditionalFields')) {
      console.log('Found additional fields')
      Object.entries(this.hidden.AdditionalFields).forEach(([key]) => {
        Object.defineProperty(this, key, {
          enumerable: true,
          get: () => {
            return this.hidden.AdditionalFields[key]
          },
          set: val => {
            if (isSetter(this.hidden.AdditionalFields, key)) {
              this.hidden.AdditionalFields[key] = val
            } else {
              this.hidden.AdditionalFields[key].value = val
            }
          },
        })
      })
    }
  }
}

var controllersMap = {
  0: {Description: '', Details: '', 'Controller Type': 'polyscience', index: '0'},
  1: {Description: '', Details: '', 'Controller Type': 'Humidity Driver', index: '1'},
}
// var controllersMap = {}

module.exports = {
  initialize: async function (test, reinit, services, serverInstance) {
    console.log('Initializing Controllers in controllers js')
    var rTimer = setTimeout(() => {
      throw new Error('Timeout')
    }, 5000)
    test = false
    if (test === undefined) {
      test = false
    }
    // console.log(test)
    // var router = [new ad.Router({portPath: '/dev/tty.usbserial-FT1JHRCW', testFlag: test, baud: 9600}), '192.12.3.145']
    var router = ['192.12.3.145',
      new ad.Router({
        portPath: '/dev/tty.usbserial-FT1JHRCW',
        testFlag: test,
        baud: 19200,
        manufacturer: 'Prolific Technology Inc.',
        delimiter: '\r\n',
      })]

    try {
      await router[1].openPort()
      clearTimeout(rTimer)
    } catch (error) {
      console.log('BIG OPEN PORT ERROR--Should NEVER reach here')
      throw error
      // throw error
    }
    if (bkup.configExists(controllersPath)) {
      // this should eventually be in a try-catch with a default config
      var loadMap = bkup.load(controllersPath)
      Object.entries(loadMap).forEach(([key, value], i) => {
        // specify bare-minimum amount that the config should have
        // console.log(value)
        if (value['Controller Type'].value === undefined) {
          // did not have bare minimum so fail out loudly
          console.log('Configuration missing critical component(s):')
          console.log('value[\'Controller Type\'].value')
          console.log(value)
        } else {
          console.log(key)
          controllersMap[key] = new ControllersC({router: router[i], Description: value.Description.value, Details: value.Details.value, testFlag: test, type: value['Controller Type'].value, index: value.Index.value, services: services, serverInstance: serverInstance})
          if (value['Controller Type'].value === 'watlow') {
            controllersMap[key].hidden.initialize({units: ['F', 'psi', 'F', 'F'], testFlag: test})
          } else {
            controllersMap[key].hidden.initialize()
          }

          // controllersMap[key] = new MFC({id: value.ID.value,router: router, testFlag: test,Description: value.Description.value,Details: value.Details.value})
        }
      })
    } else {
      // add details to valve map
      Object.entries(controllersMap).forEach(([key, value], i) => {
        console.log(value)
        // var router = selectRouter({controlSystem: value.type.value, test: test})
        controllersMap[key] = new ControllersC({router: router[i], Description: value.Description, Details: value.Details, testFlag: test, type: value['Controller Type'], index: value.index, services: services, serverInstance: serverInstance})
        if (controllersMap[key]['Controller Type'].value === 'watlow') {
          controllersMap[key].hidden.initialize({units: ['F', 'psi', 'F', 'F'], testFlag: test})
        } else {
          controllersMap[key].hidden.initialize()
        }
        console.log(controllersMap[key])
        bkup.save(controllersMap[key], controllersPath)
      })
    }
    return
  },
  id: controllersID,
  obj: controllersMap,
  path: controllersPath,
}
