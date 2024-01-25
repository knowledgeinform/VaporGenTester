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

const pinMap = require('./pin-map.js')
const rpio = require('rpio')
const ui = require('./ui.js')
const bkup = require('./backup.js')
const db = require('./database.js')
// const ad = require('./abstract-driver.js')

var valvesID = 'valves'
var valvesPath = 'config/' + valvesID

class ValveC {
  constructor({
    GPIO,
    ValveNumber,
    Description,
    Details,
    // State,
    testFlag,
  }) {
    this.Valve = new ui.ShowUser({value: ValveNumber.toString()})
    Object.defineProperty(this, 'testFlag', {
      writable: true,
      value: testFlag,
    })
    this.GPIO = new ui.ShowUser({value: GPIO, type: ['output', 'number']})
    this.Description = new ui.ShowUser({value: Description})
    this.Details = new ui.ShowUser({value: Details})
    Object.defineProperty(this, 'valveState', {
      value: new ui.ShowUser({value: false, type: ['output', 'binary']}),
      writable: true,
    })
    Object.defineProperty(this, 'State', {
      enumerable: true,
      get: () => {
        return this.valveState
      },
      set: val => {
        console.log('Setting Valve ' + this.Valve.value.toString() + ' to ' + val.toString())
        var pinMapIndex = pinMap.getIndexFromGPIO(this.GPIO.value)
        if (val) {
          rpio.write(pinMap.HeaderNumber[pinMapIndex], rpio.HIGH)
        } else {
          rpio.write(pinMap.HeaderNumber[pinMapIndex], rpio.LOW)
        }
        this.valveState.value = val
        console.log('Valve State')
        console.log(this.valveState)
        if (this.testFlag) console.log('Valve: ' + this.Valve + ' ' + val + ' (GPIO ' + this.GPIO.value +
        ' Header: ' + pinMap.HeaderNumber[pinMapIndex] + ' Info: ' + pinMap.Name[pinMapIndex] + ')')
      },
    })
    this.datastreams = {refreshRate: 300}
    this.updateable = ['State']
  }
}

class ToggleC {
  constructor({id = 'Toggle', valve1, valve2, Description = '', Details = '', testFlag = true}) {
    this.ID = new ui.ShowUser({value: id})
    this.Description = new ui.ShowUser({value: Description})
    this.Details = new ui.ShowUser({value: Details})
    Object.defineProperty(this, 'toggleState', {
      value: new ui.ShowUser({value: false, type: ['output', 'binary']}),
      writable: true,
    })
    Object.defineProperty(this, 'valve1', {
      value: valve1,
    })
    Object.defineProperty(this, 'valve2', {
      value: valve2,
    })
    Object.defineProperty(this, 'valve1State', {
      value: valve1.State,
    })
    Object.defineProperty(this, 'valve2State', {
      value: valve2.State,
    })
    Object.defineProperty(this, 'State', {
      enumerable: true,
      get: () => {
        return this.toggleState
      },
      set: val => {
        toggle(this.valve1)
        toggle(this.valve2)
        this.toggleState.value = val
      },
    })
    // note that in value, the path is intentionally left undefined for now
    console.log(testFlag)
    this.Database = new ui.ShowUser({
      value: [{
        id: 'Settings',
        obj: {0: new db.GUI({
          measurementName: 'toggle_measurement',
          fields: ['valve1State', 'valve2State', 'State'],
          obj: this,
          testFlag: testFlag,
          objPath: valvesPath,
        })},
        path: valvesPath + '/' + db.path + '/' + bkup.fileName(this) + '.json',
      }],
      type: ['output', 'link'],
    })
  }
}

var valveMap = {
  1: new ValveC({GPIO: 17, ValveNumber: 1, Description: '', Details: '', State: 0}),
  2: new ValveC({GPIO: 27, ValveNumber: 2, Description: '', Details: '', State: 0}),
  Toggle: {ID: new ui.ShowUser({value: 'Toggle'})},
}

function lookupPins(vMap) {
  var pins = []
  // console.log(typeof vMap)
  Object.entries(vMap).forEach(([key, value]) => {
    if (key === 'Toggle') {
      // don't push
    } else {
      pins.push(pinMap.HeaderNumber[pinMap.getIndexFromGPIO(value.GPIO.value)])
    }
  })
  // console.log(pins)
  return pins
}

function pullDownPins() {
  var pins = lookupPins(valveMap)
  // var state = rpio.PULL_DOWN
  for (var pin of pins) {
    /* Configure pin as output with the initiate state set low */
    rpio.open(pin, rpio.OUTPUT, rpio.LOW)
  }
}

function toggle(valve) {
  var pinMapIndex = pinMap.getIndexFromGPIO(valve.GPIO.value)
  if (valve.State.value) {
    rpio.write(pinMap.HeaderNumber[pinMapIndex], rpio.LOW)
    valve.State = false
  } else {
    rpio.write(pinMap.HeaderNumber[pinMapIndex], rpio.HIGH)
    valve.State = true
  }
  console.log('Valve: ' + valve.Valve.value + ' ' + valve.State.value + ' (GPIO ' + valve.GPIO.value +
  ' Header: ' + pinMap.HeaderNumber[pinMapIndex] + ' Info: ' + pinMap.Name[pinMapIndex] + ')')
}

module.exports = {
  initialize: function (test) {
    return new Promise(resolve => {
      // test = true
      console.log('intializing valves')
      console.log(test)
      // intialize pins
      this.pinInit(test)

      if (bkup.configExists(valvesPath)) {
        // this should eventually be in a try-catch with a default config
        var loadMap = bkup.load(valvesPath)
        Object.entries(loadMap).forEach(([key, value]) => {
          // specify bare-minimum amount that the config should have
          if (key === 'Toggle') {
            valveMap[key] = new ToggleC({
              id: 'Toggle',
              valve1: valveMap['1'],
              valve2: valveMap['2'],
              Description: value.Description.value,
              Details: value.Details.value,
              State: value.State.value,
              testFlag: test,
            })
          } else {
            if (value.GPIO.value === undefined) {
              // did not have bare minimum so fail out loudly
              console.log('Configuration missing critical component(s):')
              console.log('value.GPIO.value')
              console.log(value)
            } else {
              // console.log(value)
              valveMap[key] = new ValveC({
                GPIO: value.GPIO.value,
                ValveNumber: value.Valve.value,
                Description: value.Description.value,
                Details: value.Details.value,
                State: value.State.value,
              })
              // valveMap[key] = new MFC({id: value.ID.value,router: router, testFlag: test,Description: value.Description.value,Details: value.Details.value})
            }
          }
        })
      } else {
        // add details to valve map
        Object.entries(valveMap).forEach(([key, value]) => {
          if (key === 'Toggle') {
            valveMap[key] = new ToggleC({id: value.ID.value, valve1: valveMap['1'], valve2: valveMap['2']})
            bkup.save(valveMap[key], valvesPath)
          } else {
            var pinMapIndex = pinMap.getIndexFromGPIO(valveMap[key].GPIO.value)
            value.Details.value = 'GPIO ' + valveMap[key].GPIO.value + ' Header: ' + pinMap.HeaderNumber[pinMapIndex] + ' Info: ' + pinMap.Name[pinMapIndex]
            // console.log(value)
            bkup.save(valveMap[key], valvesPath)
          }
        })
      }
      console.log('valvemap')
      console.log(valveMap)
      return resolve()
    })
  },
  pinInit: function (test) {
    if (test) {
      console.log('Operating in test-mode')
      /*
       * Explicitly request mock mode to avoid warnings when running on known
       * unsupported hardware, or to test scripts in a different hardware
       * environment (e.g. to check pin settings).
       */
      rpio.init({mock: 'raspi-3'})

      /* Override default warn handler to avoid mock warnings */
      rpio.on('warn', function () {})
    } else {
      rpio.init({gpiomem: false})
    }
    pullDownPins()
  },
  toggle: valveMap[2].State,
  id: valvesID,
  obj: valveMap,
  path: valvesPath,
  Valve: ValveC,
}
