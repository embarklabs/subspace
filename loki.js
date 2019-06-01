var loki = require('lokijs')

var db = new loki('loki2.json')
db.loadDatabase()

var children = db.getCollection('children')
if (!children) {
  console.dir("collection not found, creating collection")
  children = db.addCollection('children')
  db.saveDatabase()
}

children.insert({a: Math.round(Math.random()*10)})

console.dir(children.find())

db.saveDatabase()
db.close()
