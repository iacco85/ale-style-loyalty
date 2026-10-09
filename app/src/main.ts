import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "@fontsource/lato/400.css";
import "@fontsource/lato/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/700.css";
import "./styles/global.css";

createApp(App).use(router).mount("#app");
