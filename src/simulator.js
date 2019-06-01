class Simulator {

  constructor(events) {
    this.events = events;
    this.contractEvents = [
      { id: 1, from: "0x123", type: "Rating", rating: 3 },
      { id: 2, from: "0x123", type: "Rating", rating: 1 },
      { id: 3, from: "0x234", type: "Rating", rating: 5 },
      { id: 4, from: "0x123", type: "Rating", rating: 4 },
      { id: 5, from: "0x123", type: "Rating", rating: 2 },
      { id: 6, from: "0x342", type: "Rating", rating: 2 }
    ]
  }

  emitEvents() {
    let i = 0
    // emit contract event each 1 second
    setInterval(() => {
      if (i >= this.contractEvents.length) return
      this.events.emit("contractEvent", this.contractEvents[i])
      i += 1
    }, 1 * 1000)
  }

}

module.exports = Simulator;