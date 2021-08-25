/* Copyright (c) 2016-present Rohi LLC.  All rights reserved. */

const xmlParser = require('xml2json');
const fs        = require('fs');
const lget      = require('lodash.get');
const Json2csv  = require('json2csv').Parser;
const argv      = require('minimist')(process.argv.slice(2));

function addSection(section, arr, parent) {
  const cases = lget(section, 'cases.case', []);
  for (let i = 0; i < cases.length; i++) {
    const steps = lget(cases[i], 'custom.steps_separated.step') || [];
    arr.push({
      folder        : `${parent ? `/${parent}/` : '/'}` + section.name.replace(/\//g, '-'),
      id            : cases[i].id,
      priority      : cases[i].priority,
      name          : cases[i].title,
      precondition  : lget(cases[i], 'custom.preconds', '').replace(/\*\*([^*]+)\*\*/g, '\n$1 '),
      step          : steps.length > 0 ? steps[0].content : '',
      expected      : steps.length > 0 ? steps[0].expected : '',
    });
    for (let s = 1; s < steps.length; s++) {
      arr.push({
        step          : steps[s].content,
        expected      : steps[s].expected,
      });
    }
  }
  const child = lget(section, 'sections.section', []);
  for (let i = 0; i < child.length; i++) {
    addSection(child[i], arr, `${parent ? `${parent}/` : ''}` + section.name)
  }
}

function convertFile(xmlName, csvName) {
  fs.readFile(xmlName, 'utf8', function(err, data) {
     if (err) {
      console.error(err)
      return
    }
    const arr      = [];
    const jsonData = JSON.parse(xmlParser.toJson(data));
    const root     = jsonData.suite.sections.section;
    for (let i = 0; i < root.length; i++) {
      addSection(root[i], arr)
    }
    const json2csv = new Json2csv({ fields: ['folder', 'id', 'priority', 'name', 'precondition', 'step', 'expected'] });
    const csv      = json2csv.parse(arr);
    fs.writeFileSync(csvName, csv);
    console.log('test cases:', arr.filter(a => a.folder).length, 'rows:', arr.length);
  });
}

if (argv.i && argv.o) {
  convertFile(argv.i, argv.o)
} else {
  console.log('syntax: node testrail2zephyr -i <testrail XML file name> -o <zephyr import CSV file name>');
}
