const { Pathfinding } = require("three-pathfinding");

AFRAME.registerSystem("nav", {
  init: function() {
    this.pathfinder = new Pathfinding();
  }
});
