import { createRouter, createWebHashHistory } from "vue-router";
import { useSession } from "./composables/useSession";
import HomeView from "./views/HomeView.vue";
import LoginView from "./views/LoginView.vue";
import MyPrizesView from "./views/MyPrizesView.vue";
import OffersView from "./views/OffersView.vue";
import WheelView from "./views/WheelView.vue";

// Hash history: dentro la WebView Capacitor non c'è un server che risolva i path
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/login", name: "login", component: LoginView },
    { path: "/", name: "home", component: HomeView },
    { path: "/offers", name: "offers", component: OffersView },
    { path: "/wheel", name: "wheel", component: WheelView },
    { path: "/prizes", name: "prizes", component: MyPrizesView },
  ],
});

router.beforeEach((to) => {
  const { isLoggedIn } = useSession();
  if (to.name !== "login" && !isLoggedIn.value) return { name: "login" };
  if (to.name === "login" && isLoggedIn.value) return { name: "home" };
});
