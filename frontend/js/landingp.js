document.addEventListener("DOMContentLoaded", function () {

  const faders = document.querySelectorAll(".fade");

  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1
    }
  );

  faders.forEach(el => {
    observer.observe(el);
  });

});


function loadLiveStats(){

fetch("/user/stats/live")
.then(res => res.json())
.then(data => {

document.getElementById("meals-count").innerText = data.meals + "+";
document.getElementById("listings-count").innerText = data.listings;
document.getElementById("users-count").innerText = data.users + "+";

});

}

loadLiveStats();
setInterval(loadLiveStats, 10000);