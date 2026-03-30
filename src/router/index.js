import { createRouter, createWebHashHistory } from "vue-router";
import GroupList from "../views/GroupList.vue";
import CreateGroup from "../views/CreateGroup.vue";
import GroupDetail from "../views/GroupDetail.vue";
import CreateEvent from "../views/CreateEvent.vue";
import EventDetail from "../views/EventDetail.vue";
import EditGroup from "../views/EditGroup.vue";
import JoinGroup from "../views/JoinGroup.vue";
import EditEvent from "../views/EditEvent.vue";
import GroupMembers from "../views/GroupMembers.vue";
import { lineProfileRef } from "../lineProfile";

const routes = [
    { path: "/", redirect: "/list" },
    {
        path: "/list",
        name: "GroupList",
        component: GroupList,
    },
    {
        path: "/create",
        name: "CreateGroup",
        component: CreateGroup,
        meta: { requiresLineAuth: true },
    },
    {
        path: "/help",
        redirect: { name: "GroupList", query: { help: "1" } },
    },
    {
        path: "/group/:id/join",
        name: "JoinGroup",
        component: JoinGroup,
    },
    {
        path: "/group/:id/edit",
        name: "EditGroup",
        component: EditGroup,
        meta: { requiresLineAuth: true },
    },
    {
        path: "/group/:id",
        name: "GroupDetail",
        component: GroupDetail,
    },
    {
        path: "/group/:id/members",
        name: "GroupMembers",
        component: GroupMembers,
    },
    {
        path: "/group/:id/create-event",
        name: "CreateEvent",
        component: CreateEvent,
        meta: { requiresLineAuth: true },
    },

    {
        path: "/group/:id/event/:eventId",
        name: "EventDetail",
        component: EventDetail,
    },

    {
        path: "/group/:id/event/:eventId/edit",
        name: "EditEvent",
        component: EditEvent,
        meta: { requiresLineAuth: true },
    },

    //防呆
    { path: "/:pathMatch(.*)*", redirect: "/list" },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

router.beforeEach((to) => {
    if (!to.meta?.requiresLineAuth) return true;
    if (lineProfileRef.value) return true;
    if (to.params?.id) return { path: `/group/${to.params.id}`, replace: true };
    return { path: "/list", replace: true };
});

export default router;
