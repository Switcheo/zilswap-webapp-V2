import React, { lazy } from "react";
import { RouteConfig } from "react-router-config";
import { Redirect } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

const routes: RouteConfig[] = [
  {
    path: "/",
    component: MainLayout,
    routes: [{
      path: "/swap",
      exact: true,
      component: lazy(() => import("./views/main/Swap")),
    }, {
      path: "/pool",
      exact: true,
      component: lazy(() => import("./views/main/Pool")),
    }, {
      path: "/bridge",
      exact: true,
      component: lazy(() => import("./views/bridge/NewBridge")),
    }, {
      component: () => <Redirect to="/swap"></Redirect>,
    }],
  },
];

export default routes;
