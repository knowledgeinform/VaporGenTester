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

const networkjson = require('./network-json.js')
const ui = require('./ui.js')

var jsonMap = {}
var jsonID = 'JSON Sensors'
// var jsonPath = 'config/' + jsonID

class JSONsensor {
  constructor({
    address,
    basePath,
    type,
    textTest,
    // refreshInterval,
    testFlag = true,
    Description,
    Details,
  }) {
    this.ID = new ui.ShowUser({value: address})
    this.Type = new ui.ShowUser({value: type})
    this.Description = new ui.ShowUser({value: Description})
    this.Details = new ui.ShowUser({value: Details})
    this.datastreams = {refreshRate: 1000}
    this.updateable = []
    Object.defineProperty(this, 'testFlag', {
      writable: true,
      value: testFlag,
    })
    Object.defineProperty(this, 'basePath', {
      writable: true,
      value: basePath,
    })
    Object.defineProperty(this, 'hidden', {
      writable: true,
      value: new networkjson.Device({
        address: this.ID.value,
        basePath: this.basePath,
        type: this.Type.value,
        testFlag: this.testFlag,
        textTest: textTest,
      }),
    })
    this.hidden.once('initialized', () => {
      Object.entries(this.hidden.object).forEach(([key]) => {
        Object.defineProperty(this, key, {
          enumerable: true,
          get: () => {
            return this.hidden.object[key]
          },
        })
      })
    })
  }
}

var addresses = ['192.12.3.144']

module.exports = {
  initialize: async function (test) {
    // test = false
    console.log('intializing JSON sensors')
    addresses.forEach(address => {
      jsonMap[address] = new JSONsensor({address: address, type: 'RoomAlert', basePath: 'getData.json', testFlag: test})
    })

    for (var a of addresses) {
      await jsonMap[a].hidden.initialize()
    }
  },
  id: jsonID,
  obj: jsonMap,
}

// For debugging

// async function start(obj) {
//   try {
//     await obj.hidden.initialize()
//     setInterval(() => {
//       console.log(obj.hidden)
//     }, 1000)
//   } catch (error) {
//     console.log('initialization error')
//     console.log(error)
//   }
// }
//
// var jsensor = new JSONsensor({address: '192.12.3.144', type: 'RoomAlert', basePath: 'getData.json', testFlag: false})
// start(jsensor)
