<template>
  <ul v-if="!!eventData$">
    <li><b>someValue: </b> {{eventData$.someValue}}</li>
    <li><b>anotherValue: </b> {{eventData$.anotherValue}}</li>
  </ul>
</template>

<script>

export default {
  name: 'MyComponent',
  props: {
    eventData: Object
  },
  subscriptions() {
    return {
      eventData$: this.eventData
    }
  }
}
</script>
