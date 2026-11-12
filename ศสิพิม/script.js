const nav = document.getElementById('nav');
const menuButton = document.getElementById('menuButton');
const pages = document.querySelectorAll('.page');
const links = document.querySelectorAll('nav a');

function showPage(hash) {
  const id = (hash || '#welcome').slice(1);
  const target = document.getElementById(id) || document.getElementById('welcome');
  pages.forEach(page => page.classList.toggle('active', page === target));
  links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === '#' + target.id));
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  window.scrollTo({top: 0, behavior: 'smooth'});
}
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  const hash = link.getAttribute('href');
  if (!hash || hash === '#') return;
  event.preventDefault();
  if (location.hash !== hash) history.pushState(null, '', hash);
  showPage(hash);
}));
window.addEventListener('popstate', () => showPage(location.hash));
menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
showPage(location.hash || '#welcome');

const workForm = document.getElementById('workForm');
const workGrid = document.querySelector('#works .work-grid');
workGrid.querySelectorAll('.work-gallery a').forEach(link => {
  link.dataset.previewType = 'image';
  link.dataset.previewUrl = link.href;
  link.dataset.fileName = link.querySelector('img')?.alt || 'รูปผลงาน';
});
const existingPdfWork = workGrid.querySelector('.pdf-work-card');
if (existingPdfWork) {
  existingPdfWork.dataset.previewType = 'pdf';
  existingPdfWork.dataset.previewUrl = existingPdfWork.href;
  existingPdfWork.dataset.fileName = 'SDLC_Digital_Blueprint.pdf';
}
const workFormStatus = document.getElementById('workFormStatus');
const workManagerTitle = document.getElementById('workManagerTitle');
const workCancelEdit = document.getElementById('workCancelEdit');
const workImageHelp = document.getElementById('workImageHelp');
const workAttachmentHelp = document.getElementById('workAttachmentHelp');
const workImageInput = document.getElementById('workImageInput');
const workImagePreviewWrap = document.getElementById('workImagePreviewWrap');
const workImagePreview = document.getElementById('workImagePreview');
const workPreviewDialog = document.getElementById('workPreviewDialog');
const workPreviewTitle = document.getElementById('workPreviewTitle');
const workPreviewType = document.getElementById('workPreviewType');
const workPreviewImage = document.getElementById('workPreviewImage');
const workPdfViewer = document.getElementById('workPdfViewer');
const workPdfCanvas = document.getElementById('workPdfCanvas');
const workPdfCanvasWrap = document.getElementById('workPdfCanvasWrap');
const workPdfLoading = document.getElementById('workPdfLoading');
const workPdfPage = document.getElementById('workPdfPage');
const workPdfPageCount = document.getElementById('workPdfPageCount');
const workPdfPrevious = document.getElementById('workPdfPrevious');
const workPdfNext = document.getElementById('workPdfNext');
const workPreviewFallback = document.getElementById('workPreviewFallback');
const workPreviewDownload = document.getElementById('workPreviewDownload');
const workPreviewClose = document.getElementById('workPreviewClose');
const workAuth = document.getElementById('workAuth');
const workLoginForm = document.getElementById('workLoginForm');
const workLogoutButton = document.getElementById('workLogoutButton');
const workAuthStatus = document.getElementById('workAuthStatus');
const supabaseConfig = window.PORTFOLIO_SUPABASE_CONFIG || {};
const supabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey && !supabaseConfig.url.includes('YOUR_') && !supabaseConfig.anonKey.includes('YOUR_'));
const supabaseReady = supabaseConfigured && Boolean(window.supabase?.createClient);
const supabaseClient = supabaseReady ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey) : null;
let workDatabase;
let workPreviewUrls = [];
let workCardUrls = [];
let currentUser = null;
let editingWorkId = null;
let activePdfLoadingTask;
let activePdfDocument;
let activePdfRenderTask;
let activePdfPage = 1;

function isPortfolioAdmin() {
  return Boolean(currentUser?.email && currentUser.email.toLowerCase() === supabaseConfig.adminEmail?.toLowerCase());
}

async function renderPreviewPdfPage() {
  if (!activePdfDocument) return;
  const page = await activePdfDocument.getPage(activePdfPage);
  const baseViewport = page.getViewport({scale: 1});
  const width = Math.max(100, workPdfCanvasWrap.clientWidth - 24);
  const height = Math.max(100, workPdfCanvasWrap.clientHeight - 24);
  const scale = Math.min(width / baseViewport.width, height / baseViewport.height);
  const viewport = page.getViewport({scale});
  const outputScale = window.devicePixelRatio || 1;
  const context = workPdfCanvas.getContext('2d');
  workPdfCanvas.width = Math.floor(viewport.width * outputScale);
  workPdfCanvas.height = Math.floor(viewport.height * outputScale);
  workPdfCanvas.style.width = `${Math.floor(viewport.width)}px`;
  workPdfCanvas.style.height = `${Math.floor(viewport.height)}px`;
  context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
  workPdfPage.textContent = String(activePdfPage);
  workPdfPrevious.disabled = activePdfPage <= 1;
  workPdfNext.disabled = activePdfPage >= activePdfDocument.numPages;
  if (activePdfRenderTask) activePdfRenderTask.cancel();
  activePdfRenderTask = page.render({canvasContext: context, viewport});
  try {
    await activePdfRenderTask.promise;
  } catch (error) {
    if (error.name !== 'RenderingCancelledException') throw error;
  }
}

async function loadPreviewPdf(url) {
  if (!window.pdfjsLib) {
    workPdfViewer.hidden = true;
    workPreviewFallback.textContent = 'โหลดตัวอ่าน PDF ไม่สำเร็จ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือดาวน์โหลดไฟล์จากปุ่มด้านบน';
    workPreviewFallback.hidden = false;
    return;
  }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  activePdfLoadingTask = window.pdfjsLib.getDocument(url);
  try {
    const document = await activePdfLoadingTask.promise;
    if (activePdfLoadingTask.destroyed) return;
    activePdfDocument = document;
    activePdfPage = 1;
    workPdfPageCount.textContent = String(document.numPages);
    workPdfLoading.hidden = true;
    await renderPreviewPdfPage();
  } catch (error) {
    workPdfViewer.hidden = true;
    workPreviewFallback.textContent = 'ไม่สามารถแสดงตัวอย่าง PDF ได้ สามารถดาวน์โหลดไฟล์จากปุ่มด้านบน';
    workPreviewFallback.hidden = false;
  }
}

function openWorkPreview(link) {
  const {previewType, previewUrl, fileName} = link.dataset;
  workPreviewTitle.textContent = fileName;
  workPreviewDownload.href = previewUrl;
  workPreviewDownload.download = fileName;
  workPreviewImage.hidden = true;
  workPdfViewer.hidden = true;
  workPreviewFallback.hidden = true;
  workPreviewImage.removeAttribute('src');

  if (previewType === 'image') {
    workPreviewType.textContent = 'IMAGE PREVIEW';
    workPreviewImage.src = previewUrl;
    workPreviewImage.alt = fileName;
    workPreviewImage.hidden = false;
  } else if (previewType === 'pdf') {
    workPreviewType.textContent = 'PDF PREVIEW';
    workPdfViewer.hidden = false;
    workPdfLoading.hidden = false;
    workPdfLoading.textContent = 'กำลังโหลด PDF...';
    loadPreviewPdf(previewUrl);
  } else {
    workPreviewType.textContent = 'FILE PREVIEW';
    workPreviewFallback.hidden = false;
  }

  if (!workPreviewDialog.open) workPreviewDialog.showModal();
}

workPreviewClose.addEventListener('click', () => workPreviewDialog.close());
workPdfPrevious.addEventListener('click', () => {
  if (activePdfPage > 1) {
    activePdfPage -= 1;
    renderPreviewPdfPage();
  }
});
workPdfNext.addEventListener('click', () => {
  if (activePdfDocument && activePdfPage < activePdfDocument.numPages) {
    activePdfPage += 1;
    renderPreviewPdfPage();
  }
});
workPreviewDialog.addEventListener('click', event => {
  if (event.target === workPreviewDialog) workPreviewDialog.close();
});
workPreviewDialog.addEventListener('close', () => {
  workPreviewImage.removeAttribute('src');
  if (activePdfRenderTask) activePdfRenderTask.cancel();
  if (activePdfLoadingTask) activePdfLoadingTask.destroy();
  activePdfLoadingTask = null;
  activePdfDocument = null;
  activePdfRenderTask = null;
});

function openWorkDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('thanathat-portfolio', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('works', {keyPath: 'id'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveWork(work, isEditing) {
  if (supabaseReady) return isEditing ? updateRemoteWork(work) : saveRemoteWork(work);
  return new Promise((resolve, reject) => {
    const transaction = workDatabase.transaction('works', 'readwrite');
    const store = transaction.objectStore('works');
    if (isEditing) {
      const request = store.get(work.id);
      request.onsuccess = () => {
        const existingWork = request.result;
        if (!existingWork) {
          transaction.abort();
          reject(new Error('Work not found'));
          return;
        }
        store.put({
          ...existingWork,
          ...work,
          images: work.images.length ? work.images : existingWork.images || [],
          attachments: work.attachments.length ? work.attachments : existingWork.attachments || []
        });
      };
      request.onerror = () => reject(request.error);
    } else {
      store.put(work);
    }
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function loadWorks() {
  if (supabaseReady) return loadRemoteWorks();
  return new Promise((resolve, reject) => {
    const request = workDatabase.transaction('works', 'readonly').objectStore('works').getAll();
    request.onsuccess = () => resolve(request.result.sort((first, second) => second.createdAt - first.createdAt));
    request.onerror = () => reject(request.error);
  });
}

function deleteWork(id) {
  if (supabaseReady) return deleteRemoteWork(id);
  return new Promise((resolve, reject) => {
    const transaction = workDatabase.transaction('works', 'readwrite');
    transaction.objectStore('works').delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function safeFileName(file) {
  return file.name.replace(/[^\w.-]+/g, '_');
}

async function uploadRemoteWorkFile(workId, file, isImage, sortOrder) {
  const path = `${workId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(file)}`;
  const {error} = await supabaseClient.storage.from('portfolio-files').upload(path, file, {contentType: file.type || 'application/octet-stream'});
  if (error) throw error;
  return {work_id: workId, storage_path: path, file_name: file.name, mime_type: file.type, is_image: isImage, sort_order: sortOrder};
}

async function uploadRemoteWorkFiles(work) {
  const files = [
    ...work.images.map((file, sortOrder) => ({file, isImage: true, sortOrder})),
    ...work.attachments.map((file, sortOrder) => ({file, isImage: false, sortOrder}))
  ];
  const uploadedFiles = [];
  try {
    for (const item of files) uploadedFiles.push(await uploadRemoteWorkFile(work.id, item.file, item.isImage, item.sortOrder));
    return uploadedFiles;
  } catch (error) {
    if (uploadedFiles.length) await supabaseClient.storage.from('portfolio-files').remove(uploadedFiles.map(file => file.storage_path));
    throw error;
  }
}

async function saveRemoteWork(work) {
  const uploadedFiles = await uploadRemoteWorkFiles(work);
  try {
    const {error} = await supabaseClient.from('portfolio_works').insert({id: work.id, title: work.title, description: work.description, tags: work.tags});
    if (error) throw error;
    if (uploadedFiles.length) {
      const {error: filesError} = await supabaseClient.from('portfolio_work_files').insert(uploadedFiles);
      if (filesError) throw filesError;
    }
  } catch (error) {
    await supabaseClient.from('portfolio_works').delete().eq('id', work.id);
    if (uploadedFiles.length) await supabaseClient.storage.from('portfolio-files').remove(uploadedFiles.map(file => file.storage_path));
    throw error;
  }
}

async function updateRemoteWork(work) {
  const {data: oldFiles, error: loadError} = await supabaseClient.from('portfolio_work_files').select('*').eq('work_id', work.id);
  if (loadError) throw loadError;
  const replaceImages = work.images.length > 0;
  const replaceAttachments = work.attachments.length > 0;
  const uploadedFiles = await uploadRemoteWorkFiles({
    ...work,
    images: replaceImages ? work.images : [],
    attachments: replaceAttachments ? work.attachments : []
  });
  try {
    const {error} = await supabaseClient.from('portfolio_works').update({title: work.title, description: work.description, tags: work.tags}).eq('id', work.id);
    if (error) throw error;
    if (uploadedFiles.length) {
      const {error: filesError} = await supabaseClient.from('portfolio_work_files').insert(uploadedFiles);
      if (filesError) throw filesError;
    }
  } catch (error) {
    if (uploadedFiles.length) await supabaseClient.storage.from('portfolio-files').remove(uploadedFiles.map(file => file.storage_path));
    throw error;
  }

  const filesToReplace = oldFiles.filter(file => (file.is_image && replaceImages) || (!file.is_image && replaceAttachments));
  if (filesToReplace.length) {
    const {error} = await supabaseClient.from('portfolio_work_files').delete().in('id', filesToReplace.map(file => file.id));
    if (!error) await supabaseClient.storage.from('portfolio-files').remove(filesToReplace.map(file => file.storage_path));
  }
}

async function loadRemoteWorks() {
  const {data, error} = await supabaseClient.from('portfolio_works').select('id,title,description,tags,created_at,portfolio_work_files(*)').order('created_at', {ascending: false});
  if (error) throw error;
  return Promise.all(data.map(async work => {
    const files = (work.portfolio_work_files || []).sort((first, second) => first.sort_order - second.sort_order);
    const images = files.filter(file => file.is_image);
    const attachments = files.filter(file => !file.is_image);
    const imageUrls = await Promise.all(images.map(async file => (await supabaseClient.storage.from('portfolio-files').createSignedUrl(file.storage_path, 3600)).data.signedUrl));
    const attachmentUrls = await Promise.all(attachments.map(async file => ({
      url: (await supabaseClient.storage.from('portfolio-files').createSignedUrl(file.storage_path, 3600, {download: file.file_name})).data.signedUrl,
      name: file.file_name
    })));
    return {id: work.id, title: work.title, description: work.description, tags: work.tags, imageUrls, attachmentUrls, createdAt: new Date(work.created_at).getTime(), images: [], attachments: []};
  }));
}

async function deleteRemoteWork(id) {
  const {data: files, error: loadError} = await supabaseClient.from('portfolio_work_files').select('id,storage_path').eq('work_id', id);
  if (loadError) throw loadError;
  const {error} = await supabaseClient.from('portfolio_works').delete().eq('id', id);
  if (error) throw error;
  if (files.length) await supabaseClient.storage.from('portfolio-files').remove(files.map(file => file.storage_path));
}

function updateWorkAuth() {
  workLoginForm.hidden = Boolean(currentUser);
  workLogoutButton.hidden = !currentUser;
  workForm.hidden = !isPortfolioAdmin();
  workAuthStatus.textContent = !currentUser
    ? 'เข้าสู่ระบบเพื่อเพิ่มหรือแก้ไขผลงาน'
    : isPortfolioAdmin()
      ? `เข้าสู่ระบบแล้ว: ${currentUser.email}`
      : 'บัญชีนี้ไม่มีสิทธิ์จัดการผลงาน';
}

function makeWorkCard(work, index) {
  const card = document.createElement('article');
  card.className = 'work-card user-work-card';

  const cover = document.createElement('div');
  cover.className = 'user-work-cover';
  let imageUrls = work.imageUrls || [];
  if (!imageUrls.length && work.images?.length) {
    imageUrls = work.images.map(file => {
      const url = URL.createObjectURL(file);
      workCardUrls.push(url);
      return url;
    });
  }
  if (!imageUrls.length && (work.imageUrl || work.image)) {
    const url = work.imageUrl || URL.createObjectURL(work.image);
    if (work.image) workCardUrls.push(url);
    imageUrls = [url];
  }
  if (imageUrls.length) {
    cover.classList.add('work-gallery', 'user-work-gallery');
    if (imageUrls.length === 1) cover.classList.add('user-work-gallery-single');
    if (imageUrls.length === 3) cover.classList.add('three-images');
    if (imageUrls.length > 3) cover.classList.add('user-work-gallery-many');
    imageUrls.forEach((url, imageIndex) => {
      const imageLink = document.createElement('a');
      imageLink.href = url;
      imageLink.dataset.previewType = 'image';
      imageLink.dataset.previewUrl = url;
      imageLink.dataset.fileName = `${work.title} รูปที่ ${imageIndex + 1}`;
      imageLink.setAttribute('aria-label', `เปิดรูปที่ ${imageIndex + 1} ของผลงาน ${work.title}`);
      const image = document.createElement('img');
      image.src = url;
      image.alt = `${work.title} รูปที่ ${imageIndex + 1}`;
      imageLink.append(image);
      cover.append(imageLink);
    });
  } else {
    const placeholder = document.createElement('span');
    placeholder.textContent = 'WORK / PROJECT';
    cover.append(placeholder);
  }

  const body = document.createElement('div');
  body.className = 'work-body';
  const label = document.createElement('small');
  label.textContent = `MY PROJECT ${String(index + 1).padStart(2, '0')}`;
  const title = document.createElement('h3');
  title.textContent = work.title;
  const description = document.createElement('p');
  description.textContent = work.description || 'ยังไม่ได้เพิ่มรายละเอียด';
  body.append(label, title, description);

  if (work.tags) {
    const tags = document.createElement('span');
    tags.className = 'tag';
    tags.textContent = work.tags;
    body.append(tags);
  }

  let attachmentFiles = work.attachmentUrls || [];
  if (!attachmentFiles.length && work.attachments?.length) {
    attachmentFiles = work.attachments.map(file => ({file, url: URL.createObjectURL(file), name: file.name}));
    attachmentFiles.forEach(file => workCardUrls.push(file.url));
  }
  if (!attachmentFiles.length && (work.attachmentUrl || work.attachment)) {
    attachmentFiles = [{
      file: work.attachment,
      url: work.attachmentUrl || URL.createObjectURL(work.attachment),
      name: work.attachment?.name || work.attachmentName
    }];
    if (work.attachment) workCardUrls.push(attachmentFiles[0].url);
  }
  if (attachmentFiles.length) {
    const attachmentList = document.createElement('div');
    attachmentList.className = 'work-attachment-list';
    attachmentFiles.forEach(file => {
      const attachment = document.createElement('a');
      attachment.className = 'work-attachment';
      attachment.href = file.url;
      const isPdf = file.file?.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      attachment.dataset.previewType = isPdf ? 'pdf' : 'file';
      attachment.dataset.previewUrl = file.url;
      attachment.dataset.fileName = file.name;
      if (isPdf) {
        attachment.classList.add('work-attachment-pdf');
        const badge = document.createElement('span');
        badge.className = 'pdf-file-badge';
        badge.textContent = 'PDF';
        const title = document.createElement('strong');
        title.textContent = file.name;
        const action = document.createElement('span');
        action.className = 'pdf-file-action';
        action.textContent = 'กดเพื่อเปิดดูไฟล์ ↗';
        attachment.append(badge, title, action);
      } else {
        attachment.textContent = `ดาวน์โหลดไฟล์: ${file.name} ↓`;
      }
      attachmentList.append(attachment);
    });
    body.append(attachmentList);
  }

  if (!supabaseReady || isPortfolioAdmin()) {
    const actions = document.createElement('div');
    actions.className = 'work-card-actions';
    const editButton = document.createElement('button');
    editButton.className = 'work-edit';
    editButton.type = 'button';
    editButton.dataset.editWork = work.id;
    editButton.setAttribute('aria-label', `แก้ไขผลงาน ${work.title}`);
    editButton.textContent = 'แก้ไข';
    const removeButton = document.createElement('button');
    removeButton.className = 'work-delete';
    removeButton.type = 'button';
    removeButton.dataset.deleteWork = work.id;
    removeButton.setAttribute('aria-label', `ลบผลงาน ${work.title}`);
    removeButton.textContent = 'ลบผลงาน';
    actions.append(editButton, removeButton);
    body.append(actions);
  }
  card.append(cover, body);
  return card;
}

async function renderWorks() {
  workCardUrls.forEach(url => URL.revokeObjectURL(url));
  workCardUrls = [];
  workGrid.querySelectorAll('.user-work-card').forEach(card => card.remove());
  const works = await loadWorks();
  const cards = document.createDocumentFragment();
  works.forEach((work, index) => cards.append(makeWorkCard(work, index)));
  workGrid.prepend(cards);
}

async function startWorkEdit(id) {
  const work = (await loadWorks()).find(item => item.id === id);
  if (!work) {
    workFormStatus.textContent = 'ไม่พบผลงานนี้ กรุณาโหลดรายการใหม่';
    return;
  }
  editingWorkId = id;
  workForm.elements.title.value = work.title;
  workForm.elements.description.value = work.description || '';
  workForm.elements.tags.value = work.tags || '';
  workImageInput.value = '';
  workForm.elements.attachments.value = '';
  workImagePreview.replaceChildren();
  workImagePreviewWrap.hidden = true;
  workManagerTitle.textContent = 'แก้ไขผลงาน';
  workImageHelp.textContent = 'เลือกรูปใหม่เพื่อแทนชุดเดิม หรือเว้นว่างเพื่อเก็บรูปเดิม';
  workAttachmentHelp.textContent = 'เลือกไฟล์ใหม่เพื่อแทนชุดเดิม หรือเว้นว่างเพื่อเก็บไฟล์เดิม';
  workCancelEdit.hidden = false;
  workForm.querySelector('.work-submit').lastChild.textContent = ' บันทึกการแก้ไข';
  workFormStatus.textContent = `กำลังแก้ไข: ${work.title}`;
  workForm.scrollIntoView({behavior: 'smooth', block: 'center'});
}

function resetWorkEditor() {
  editingWorkId = null;
  workForm.reset();
  workImagePreviewWrap.hidden = true;
  workImagePreview.replaceChildren();
  workPreviewUrls.forEach(url => URL.revokeObjectURL(url));
  workPreviewUrls = [];
  workManagerTitle.textContent = 'เพิ่มผลงานใหม่';
  workImageHelp.textContent = 'เลือกได้หลายรูป ภาพแรกจะแสดงเป็นภาพปก';
  workAttachmentHelp.textContent = 'เลือกแนบได้หลายไฟล์ เช่น PDF, เอกสาร หรือโค้ด';
  workCancelEdit.hidden = true;
  workForm.querySelector('.work-submit').lastChild.textContent = ' เพิ่มผลงาน';
}

if (workForm && workGrid && workFormStatus) {
  if (supabaseConfigured && !supabaseReady) {
    workAuth.hidden = false;
    workForm.hidden = true;
    workLoginForm.hidden = true;
    workLogoutButton.hidden = true;
    workAuthStatus.textContent = 'โหลด Supabase ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  } else if (supabaseReady) {
    workAuth.hidden = false;
    workForm.hidden = true;
    workForm.querySelector('.work-storage-note').textContent = 'ผลงานจะบันทึกออนไลน์และแสดงให้ผู้เข้าชมเว็บไซต์';
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      updateWorkAuth();
      try {
        await renderWorks();
      } catch (error) {
        workAuthStatus.textContent = 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาตรวจ URL, anon key และ SQL setup';
        workFormStatus.textContent = 'โหลดผลงานไม่สำเร็จ กรุณาตรวจการตั้งค่า Supabase';
      }
    });
  } else {
    workAuth.hidden = true;
    workForm.hidden = false;
    workForm.querySelector('.work-storage-note').textContent = 'โหมดตัวอย่าง: ผลงานจะบันทึกไว้ในเบราว์เซอร์เครื่องนี้';
    openWorkDatabase().then(async database => {
      workDatabase = database;
      await renderWorks();
    }).catch(() => {
      workFormStatus.textContent = 'ไม่สามารถเปิดพื้นที่จัดเก็บผลงานได้ กรุณาลองเปิดเว็บไซต์ด้วยเบราว์เซอร์อื่น';
      workForm.querySelector('button[type="submit"]').disabled = true;
    });
  }

  workLoginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(workLoginForm);
    const button = workLoginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    workAuthStatus.textContent = 'กำลังเข้าสู่ระบบ...';
    try {
      const {error} = await supabaseClient.auth.signInWithPassword({email: formData.get('email'), password: formData.get('password')});
      if (error) throw error;
    } catch (error) {
      workAuthStatus.textContent = 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจอีเมลและรหัสผ่าน';
    }
    button.disabled = false;
  });

  workLogoutButton.addEventListener('click', async () => {
    try {
      const {error} = await supabaseClient.auth.signOut();
      if (error) throw error;
    } catch (error) {
      workAuthStatus.textContent = 'ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง';
    }
  });

  workImageInput.addEventListener('change', () => {
    workPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    workPreviewUrls = [];
    workImagePreview.replaceChildren();
    const images = Array.from(workImageInput.files);
    workImagePreviewWrap.hidden = !images.length;
    images.forEach(file => {
      const url = URL.createObjectURL(file);
      workPreviewUrls.push(url);
      const preview = document.createElement('img');
      preview.src = url;
      preview.alt = file.name;
      preview.title = file.name;
      workImagePreview.append(preview);
    });
  });

  workForm.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(workForm);
    const isEditing = Boolean(editingWorkId);
    const images = formData.getAll('images').filter(file => file.size);
    const attachments = formData.getAll('attachments').filter(file => file.size);
    const work = {
      id: editingWorkId || (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
      title: formData.get('title').trim(),
      description: formData.get('description').trim(),
      tags: formData.get('tags').trim(),
      images,
      attachments,
      createdAt: Date.now()
    };

    workFormStatus.textContent = 'กำลังบันทึกผลงาน...';
    workForm.querySelector('button[type="submit"]').disabled = true;
    try {
      await saveWork(work, isEditing);
      resetWorkEditor();
      await renderWorks();
      workFormStatus.textContent = isEditing ? 'บันทึกการแก้ไขเรียบร้อยแล้ว' : 'เพิ่มผลงานเรียบร้อยแล้ว';
    } catch (error) {
      workFormStatus.textContent = supabaseReady
        ? 'บันทึกไม่สำเร็จ กรุณาตรวจการล็อกอิน สิทธิ์ฐานข้อมูล และขนาดไฟล์'
        : 'บันทึกไม่สำเร็จ พื้นที่จัดเก็บอาจไม่เพียงพอ กรุณาลองใช้ไฟล์ขนาดเล็กลง';
    } finally {
      workForm.querySelector('button[type="submit"]').disabled = false;
    }
  });

  workGrid.addEventListener('click', async event => {
    const editButton = event.target.closest('button[data-edit-work]');
    if (editButton && (!supabaseReady || isPortfolioAdmin())) {
      try {
        await startWorkEdit(editButton.dataset.editWork);
      } catch (error) {
        workFormStatus.textContent = 'เปิดข้อมูลเพื่อแก้ไขไม่สำเร็จ กรุณาลองอีกครั้ง';
      }
      return;
    }
    const previewLink = event.target.closest('a[data-preview-type]');
    if (previewLink) {
      event.preventDefault();
      openWorkPreview(previewLink);
      return;
    }
    const button = event.target.closest('button[data-delete-work]');
    if (!button || (supabaseReady && !isPortfolioAdmin()) || !window.confirm('ต้องการลบผลงานชิ้นนี้หรือไม่?')) return;
    button.disabled = true;
    try {
      await deleteWork(button.dataset.deleteWork);
      await renderWorks();
      workFormStatus.textContent = 'ลบผลงานแล้ว';
    } catch (error) {
      button.disabled = false;
      workFormStatus.textContent = 'ลบผลงานไม่สำเร็จ กรุณาลองอีกครั้ง';
    }
  });

  workCancelEdit.addEventListener('click', () => {
    resetWorkEditor();
    workFormStatus.textContent = 'ยกเลิกการแก้ไขแล้ว';
  });
}
