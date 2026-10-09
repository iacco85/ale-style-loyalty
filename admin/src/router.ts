import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "./composables/useAuth";
import BroadcastView from "./views/BroadcastView.vue";
import CustomerDetailView from "./views/CustomerDetailView.vue";
import CustomersView from "./views/CustomersView.vue";
import LoginView from "./views/LoginView.vue";
import PrizesView from "./views/PrizesView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: LoginView },
    { path: "/", name: "customers", component: CustomersView },
    { path: "/customers/:id", name: "customer", component: CustomerDetailView, props: true },
    { path: "/broadcast", name: "broadcast", component: BroadcastView },
    { path: "/prizes", name: "prizes", component: PrizesView },
  ],
});

router.beforeEach((to) => {
  const { isLoggedIn } = useAuth();
  if (to.name !== "login" && !isLoggedIn.value) return { name: "login" };
  if (to.name === "login" && isLoggedIn.value) return { name: "customers" };
});
