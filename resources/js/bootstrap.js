import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;
window.axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
window.axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';

const csrfTokenMeta = document.head.querySelector('meta[name="csrf-token"]');
if (csrfTokenMeta?.content) {
	window.axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfTokenMeta.content;
}
