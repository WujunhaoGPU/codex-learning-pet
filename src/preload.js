const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("learningPet", {
  onState(callback) {
    ipcRenderer.on("learning-state", (_event, state) => callback(state));
  },
  setView(view) {
    ipcRenderer.send("set-view", view);
  },
  setRouteLocked(locked) {
    ipcRenderer.send("set-route-locked", locked);
  },
  setFollowLatest(followLatest) {
    ipcRenderer.send("set-follow-latest", followLatest);
  },
  openKnowledgeFile() {
    ipcRenderer.send("open-knowledge-file");
  },
  saveCurrentRound() {
    ipcRenderer.send("save-current-round");
  }
});
