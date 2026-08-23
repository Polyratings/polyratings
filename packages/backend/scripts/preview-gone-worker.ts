export default {
    fetch(): Response {
        return new Response("This pull request preview has been removed.", {
            status: 410,
        });
    },
};
