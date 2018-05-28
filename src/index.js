import("./add.c").then((exports) => {
  document.body.innerHTML = "1+1=" + exports._add(1, 1);
});
