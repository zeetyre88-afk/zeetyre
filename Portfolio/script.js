// Shared portfolio interactions and page behavior
const body = document.body;
const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const loadingScreen = document.getElementById('loadingScreen');
const backToTop = document.querySelector('.back-to-top');
const revealItems = document.querySelectorAll('.reveal');
const progressBars = document.querySelectorAll('.progress span');
const galleryGrid = document.getElementById('galleryGrid');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxClose = document.getElementById('lightboxClose');
const imageUpload = document.getElementById('imageUpload');
const uploadStatus = document.getElementById('uploadStatus');
const form = document.querySelector('.contact-form');
const GALLERY_STORAGE_KEY = 'portfolio-gallery-uploads';
const API_BASE = window.location.origin && window.location.origin !== 'null'
  ? window.location.origin
  : 'http://127.0.0.1:8000';
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.15 });

const loadSavedGalleryImages = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(GALLERY_STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const saveGalleryImages = (items) => {
  localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items));
};

const setUploadStatus = (message, isError = false) => {
  if (!uploadStatus) return;
  uploadStatus.textContent = message;
  uploadStatus.classList.toggle('error', isError);
};

const uploadFilesToServer = async (files) => {
  if (window.location.protocol === 'file:') {
    throw new Error('Open the portfolio through http://127.0.0.1:8000/gallery.html before uploading images.');
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}.`);
  }

  return response.json();
};

const createGalleryFigure = (src, alt) => {
  const figure = document.createElement('figure');
  figure.className = 'gallery-item reveal';
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.addEventListener('click', () => openLightbox(src));
  figure.appendChild(img);
  galleryGrid?.appendChild(figure);
  revealObserver.observe(figure);
  return figure;
};

const restoreUploadedGalleryItems = () => {
  const savedUploads = loadSavedGalleryImages();
  savedUploads.forEach((item) => {
    createGalleryFigure(item.src, item.alt);
  });
};

const restoreServerGalleryItems = async () => {
  try {
    const response = await fetch(`${API_BASE}/gallery-assets`);
    const uploads = await response.json();
    uploads.forEach((item) => {
      createGalleryFigure(item.path, item.name);
    });
  } catch {
    // Server-side persistence is unavailable in the simplest static preview mode.
  }
};

window.addEventListener('load', async () => {
  setTimeout(() => loadingScreen?.classList.add('hide'), 700);
  await restoreServerGalleryItems();
});

menuToggle?.addEventListener('click', () => {
  siteNav?.classList.toggle('open');
});

if (siteNav) {
  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => siteNav.classList.remove('open'));
  });
}

revealItems.forEach((item) => revealObserver.observe(item));

progressBars.forEach((bar) => {
  const width = bar.dataset.width || '80%';
  requestAnimationFrame(() => {
    bar.style.width = width;
  });
});

const openLightbox = (src) => {
  lightboxImage.src = src;
  lightbox.classList.add('show');
};

restoreUploadedGalleryItems();

document.querySelectorAll('.gallery-item img').forEach((img) => {
  img.addEventListener('click', () => openLightbox(img.src));
});

lightboxClose?.addEventListener('click', () => lightbox.classList.remove('show'));
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.classList.remove('show');
});

imageUpload?.addEventListener('change', async (event) => {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
  if (!files.length) return;

  try {
    setUploadStatus('Uploading image...');
    const savedUploads = loadSavedGalleryImages();
    const uploaded = await uploadFilesToServer(files);

    uploaded.forEach((item) => {
      const src = item.path;
      const newItem = { src, alt: item.name };
      savedUploads.push(newItem);
      saveGalleryImages(savedUploads);
      createGalleryFigure(src, item.name);
    });

    setUploadStatus(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded.`);
  } catch (error) {
    setUploadStatus(error.message || 'Upload failed. Please open the site through the local server URL.', true);
  }
});

window.addEventListener('scroll', () => {
  backToTop?.classList.toggle('show', window.scrollY > 420);
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = new FormData(form).get('name');
  if (name) {
    alert(`Thanks, ${name}! Your message has been queued.`);
    form.reset();
  }
});

const typedElement = document.getElementById('typingName');
if (typedElement) {
  const text = typedElement.textContent.trim();
  typedElement.textContent = '';
  let index = 0;
  const typingLoop = () => {
    typedElement.textContent = text.slice(0, index++);
    if (index <= text.length) setTimeout(typingLoop, 200);
  };
  typingLoop();
}
