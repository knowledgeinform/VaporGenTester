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

const db = require('./database.js')
const ui = require('./ui.js')
const bkup = require('./backup.js')
const ad = require('./abstract-driver.js')
const ozone49C = require('./ozone49-c.js')

var ozoneAnalyzerID = 'Ozone Analyzer'
var ozoneAnalyzerPath = 'config/' + ozoneAnalyzerID

class OzoneAnalyzer {
  constructor({
    id,
    // Description = '',
    // Details = '',
    type = 'Thermo49C',
    testFlag = true,
    router,
  }) {
    // super()
    this.ID = new ui.ShowUser({value: id})
    Object.defineProperty(this, 'testFlag', {
      writable: true,
      value: testFlag,
    })
    this['Ozone Analyzer Type'] = new ui.ShowUser({value: type})
    // hidden defined here to avoid being enumerated
    Object.defineProperty(this, 'hidden', {
      writable: true,
      value: {},
    })
    if (type === 'Thermo49C') {
      this.hidden = new ozone49C.Device({id: Number(this.ID.value), testFlag: testFlag, router: router})
    } else {
      console.log('UKNOWN OZONE ANALYZER TYPE')
      console.log(type)
      return
    }
    // note that in value, the path is intentionally left undefined for now
    this.datastreams = {refreshRate: 8000}
    this.updateable = ['Range']
    Object.defineProperty(this, 'O3 Concentration', {
      enumerable: true,
      get: function () {
        return new ui.ShowUser({value: this.hidden.o3, type: ['input', 'datapoint']})
      },
    })
    Object.defineProperty(this, 'Gas Mode', {
      enumerable: true,
      get: function () {
        return new ui.ShowUser({value: this.hidden.gasMode.value, type: ['input', 'string']})
      },
    })
    Object.defineProperty(this, 'O3 Background', {
      enumerable: true,
      get: function () {
        return new ui.ShowUser({value: this.hidden.o3Background, type: ['input', 'datapoint']})
      },
    })
    Object.defineProperty(this, 'Temperature Compensation', {
      enumerable: true,
      get: function () {
        return new ui.ShowUser({value: this.hidden.temperatureCompensation, type: ['output', 'binary']})
      },
      set: function (val) {
        console.log('Insider Temperature Compensation setter')
        this.hidden.temperatureCompensation = val
      },
    })
    Object.defineProperty(this, 'Pressure Compensation', {
      enumerable: true,
      get: function () {
        return new ui.ShowUser({value: this.hidden.pressureCompensation, type: ['output', 'binary']})
      },
      set: function (val) {
        console.log('Insider Pressure Compensation setter')
        this.hidden.pressureCompensation = val
      },
    })
    Object.defineProperty(this, 'Bench Temperature', {
      enumerable: true,
      get: function () {
        return new ui.ShowUser({value: this.hidden.benchTemperature, type: ['input', 'datapoint']})
      },
    })
    Object.defineProperty(this, 'Lamp Temperature', {
      enumerable: true,
      get: function () {
        return new ui.ShowUser({value: this.hidden.lampTemperature, type: ['input', 'datapoint']})
      },
    })
    Object.defineProperty(this, 'Cell A Intensity', {
      enumerable: true,
      get: function () {
        return new ui.ShowUser({value: this.hidden.cellAIntensity, type: ['input', 'datapoint']})
      },
    })
    Object.defineProperty(this, 'Cell B Intensity', {
      enumerable: true,
      get: function () {
        return new ui.ShowUser({value: this.hidden.cellBIntensity, type: ['input', 'datapoint']})
      },
    })
    Object.defineProperty(this, 'Chamber Pressure', {
      enumerable: true,
      get: function () {
        return new ui.ShowUser({value: this.hidden.pressure, type: ['input', 'datapoint']})
      },
    })
    Object.defineProperty(this, 'Flow A', {
      enumerable: true,
      get: function () {
        var ret = this.hidden.flow
        return new ui.ShowUser({value: ret[0], type: ['input', 'datapoint']})
        // return new ui.ShowUser({value: this.hidden., type: ['input', 'datapoint']})
      },
    })
    Object.defineProperty(this, 'Flow B', {
      enumerable: true,
      get: function () {
        var ret = this.hidden.flow
        return new ui.ShowUser({value: ret[1], type: ['input', 'datapoint']})
        // return new ui.ShowUser({value: this.hidden., type: ['input', 'datapoint']})
      },
    })
    Object.defineProperty(this, 'Range', {
      enumerable: true,
      get: function () {
        var r = this.hidden.range
        return (new ui.ShowUser({value: r, type: ['output', 'list']}))
      },
      set: function (val) {
        this.hidden.range = val
      },
    })
    Object.defineProperty(this, 'Rangelist', {
      get: function () {
        var list = this.hidden.rangeList
        return list
      },
    })
    Object.defineProperty(this, 'Sample Gas', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: new ui.Action({name: 'post', data: this.State}), type: ['output', 'button']}))
      },
      set: ({res}) => {
        this.hidden.setSampleGas()
        res.json(this.Stop)
      },
    })
    Object.defineProperty(this, 'Zero Gas', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: new ui.Action({name: 'post', data: this.State}), type: ['output', 'button']}))
      },
      set: ({res}) => {
        this.hidden.setZeroGas()
        res.json(this.Stop)
      },
    })
    this.Database = new ui.ShowUser({
      value: [{
        id: 'Settings',
        obj: {0: new db.GUI({
          measurementName: 'ozoneAnalyzer_basic',
          fields: ['O3 Concentration',
            'Gas Mode',
            'O3 Background',
            'Temperature Compensation',
            'Pressure Compensation',
            'Bench Temperature',
            'Lamp Temperature',
            'Cell A Intensity',
            'Cell B Intensity',
            'Chamber Pressure',
            'Flow A',
            'Flow B'],
          obj: this,
          testFlag: this.testFlag,
          objPath: ozoneAnalyzerPath,
          units: 's',
          readRate: 9,
        })},
        path: ozoneAnalyzerPath + '/' + db.path + '/' + bkup.fileName(this) + '.json',
      }],
      type: ['output', 'link'],
    })
  }
}

var ozoneAnalyzerMap = {}
var addresses = ['49']

module.exports = {
  initialize: async function (test) {
    console.log('intializing ozone analyzers')
    var rTimer = setTimeout(() => {
      throw new Error('Timeout')
    }, 5000)
    var router = [new ad.Router({portPath: '/dev/ttyUSB3', baud: 9600, testFlag: test, timing: true, manufacturer: 'FTDI', seriallineSerial: 'A603J5JA'})]
    try {
      await router[0].openPort()
      clearTimeout(rTimer)
    } catch (error) {
      console.log('BIG OPEN PORT ERROR--Should NEVER reach here')
      throw error
      // throw error
    }
    addresses.forEach((address, i) => {
      ozoneAnalyzerMap[address] = new OzoneAnalyzer({id: address, type: 'Thermo49C', testFlag: test, router: router[i]})
    })
  },
  id: ozoneAnalyzerID,
  obj: ozoneAnalyzerMap,
}
