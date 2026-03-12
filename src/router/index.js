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
    },

    //防呆
    { path: "/:pathMatch(.*)*", redirect: "/list" },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

export default router;
