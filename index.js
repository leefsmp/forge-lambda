'use strict'

///////////////////////////////////////////////////////////
// Node imports, must be installed with npm install and
// packaged along the lambda code zip
//
///////////////////////////////////////////////////////////
const Promise = require('bluebird')
const Forge = require('forge-apis')
const config = require('./config')
const path = require('path')
const fs = require('mz/fs')
const ejs = require('ejs')

///////////////////////////////////////////////////////////
// Lambda Handler, this is the method that gets invoked
// when the lambda server is triggered
//
///////////////////////////////////////////////////////////
const lambdaHandler = (event, context, callback) => {

  // set the PATH
  process.env['PATH'] =
    process.env['PATH'] + ':' +
    process.env['LAMBDA_TASK_ROOT']

  // gets oauth token from Forge API
  const oAuth2TwoLegged = new Forge.AuthClientTwoLegged(
    process.env.FORGE_CLIENT_ID,
    process.env.FORGE_CLIENT_SECRET,
    ['viewables:read'])

  // packs the various tasks required to generate html code
  const tasks = [
    fs.readFile(path.resolve(__dirname, 'index.ejs'), 'utf8'),
    fs.readFile(path.resolve(__dirname, 'app.ejs'), 'utf8'),
    oAuth2TwoLegged.authenticate()
  ]

  // wait for completion of each tasks
  Promise.all(tasks).then((res) => {

    const htmlEjs = res[0]

    const appEjs = res[1]

    const token = res[2]

    // formats client code with token
    const app = ejs.render(appEjs, {
      accessToken: token.access_token,
      urn: process.env.URN
    })

    // renders html code
    const html = ejs.render(htmlEjs, {
      viewer3D: config.viewer.viewer3D,
      threeJS: config.viewer.threeJS,
      style: config.viewer.style,
      app: app
    })

    // returns response to caller
    callback (null, html.replace(/&#34;/g, '"'))
  })
}

exports.handler = lambdaHandler
