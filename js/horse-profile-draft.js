/**
 * Pre-auth horse profile: collect basics, persist to sessionStorage, then show sign-in wall.
 * Field names align with thc-native horseProfiles (gender, not sex).
 */
(function () {
  var DRAFT_KEY = "thc_horse_profile_draft_v1";
  var MAX_PHOTO_BYTES = 2.5 * 1024 * 1024;

  var form = document.getElementById("horse-profile-form");
  var stepForm = document.getElementById("horse-profile-step-form");
  var stepAuth = document.getElementById("horse-profile-step-auth");
  var btnBack = document.getElementById("horse-profile-edit-details");
  var nameInput = document.getElementById("horse-name");

  var pendingPhotoFile = null;
  var photoInput = document.getElementById("horse-photo");

  if (photoInput) {
    photoInput.addEventListener("change", function () {
      pendingPhotoFile =
        photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;
      window.__thcPendingHorsePhoto = pendingPhotoFile;
    });
  }

  if (!form || !stepForm || !stepAuth) return;

  function loadDraft() {
    try {
      var raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (!d || typeof d !== "object") return;
      if (nameInput && d.name) nameInput.value = d.name;
      var breed = document.getElementById("horse-breed");
      var age = document.getElementById("horse-age");
      var sex = document.getElementById("horse-sex");
      if (breed && d.breed) breed.value = d.breed;
      if (age && d.age) age.value = d.age;
      if (sex && d.gender) {
        var g = String(d.gender).toLowerCase();
        if (g === "mare") sex.value = "mare";
        else if (g === "gelding") sex.value = "gelding";
        else if (g === "stallion") sex.value = "stallion";
      }
    } catch (e) {
      console.warn("horse draft restore failed", e);
    }
  }

  function genderFromSelect(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  function readPhotoAsDataURL(file) {
    if (!file) return Promise.resolve(null);
    if (file.size > MAX_PHOTO_BYTES) {
      window.alert(
        "This photo is over 2.5 MB. Please choose a smaller image or continue without a photo."
      );
      return Promise.resolve(null);
    }
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(reader.error);
      };
      reader.readAsDataURL(file);
    });
  }

  function showFormStep() {
    stepForm.hidden = false;
    stepAuth.hidden = true;
  }

  function showAuthWall() {
    stepForm.hidden = true;
    stepAuth.hidden = false;
    stepAuth.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
      window.alert("Please enter your horse’s name.");
      if (nameInput) nameInput.focus();
      return;
    }

    var photoInputEl = document.getElementById("horse-photo");
    var file =
      photoInputEl && photoInputEl.files && photoInputEl.files[0]
        ? photoInputEl.files[0]
        : pendingPhotoFile;
    if (file) {
      pendingPhotoFile = file;
      window.__thcPendingHorsePhoto = file;
    }

    var previousPhoto = null;
    try {
      var prevRaw = sessionStorage.getItem(DRAFT_KEY);
      if (prevRaw) {
        var prev = JSON.parse(prevRaw);
        if (prev && prev.photoDataUrl) previousPhoto = prev.photoDataUrl;
      }
    } catch (ignore) {}

    readPhotoAsDataURL(file)
      .then(function (photoDataUrl) {
        if (!photoDataUrl && previousPhoto) photoDataUrl = previousPhoto;

        var sexEl = document.getElementById("horse-sex");
        var breedEl = document.getElementById("horse-breed");
        var ageEl = document.getElementById("horse-age");

        var draft = {
          version: 1,
          name: name,
          breed: breedEl ? breedEl.value.trim() : "",
          age: ageEl ? ageEl.value.trim() : "",
          gender: sexEl ? genderFromSelect(sexEl.value) : "",
          color: "",
          height: "",
          weight: "",
          description: "",
          photoDataUrl: photoDataUrl,
          savedAt: new Date().toISOString(),
        };

        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
          if (pendingPhotoFile) {
            try {
              sessionStorage.setItem(
                DRAFT_KEY + "_has_photo",
                pendingPhotoFile.name || "1"
              );
            } catch (ignore) {}
          }
        } catch (err) {
          if (photoDataUrl) {
            draft.photoDataUrl = null;
            try {
              sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
              window.alert(
                "Photo couldn’t be saved in the browser (storage full). Your other details were saved — add a photo in the app if you like."
              );
            } catch (err2) {
              window.alert("Could not save your details in the browser. Try again or use a smaller photo.");
              return;
            }
          } else {
            window.alert("Could not save your details in the browser. Please try again.");
            return;
          }
        }

        showAuthWall();
        window.dispatchEvent(new CustomEvent("thcHorseDraftReady", { bubbles: true }));
      })
      .catch(function () {
        window.alert("Could not read the photo file. Try another image or continue without a photo.");
      });
  });

  if (btnBack) {
    btnBack.addEventListener("click", function () {
      showFormStep();
      if (nameInput) nameInput.focus();
    });
  }

  loadDraft();
})();
