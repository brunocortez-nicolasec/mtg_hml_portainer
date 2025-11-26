import Axios from "axios";

// Pega a variável do .env (ou do Docker Compose). Se não tiver, usa localhost (dev).
const API_URL = process.env.REACT_APP_API_URL;

export class HttpService {
  // CORREÇÃO CRÍTICA AQUI:
  // Passamos a baseURL diretamente na criação da instância.
  _axios = Axios.create({
    baseURL: API_URL,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });

  addRequestInterceptor = (onFulfilled, onRejected) => {
    this._axios.interceptors.request.use(onFulfilled, onRejected);
  };

  addResponseInterceptor = (onFulfilled, onRejected) => {
    this._axios.interceptors.response.use(onFulfilled, onRejected);
  };

  get = async (url) => await this.request(this.getOptionsConfig("get", url));

  post = async (url, data) => await this.request(this.getOptionsConfig("post", url, data));

  put = async (url, data) => await this.request(this.getOptionsConfig("put", url, data));

  patch = async (url, data) => await this.request(this.getOptionsConfig("patch", url, data));

  delete = async (url) => await this.request(this.getOptionsConfig("delete", url));

  getOptionsConfig = (method, url, data) => {
    return {
      method,
      url,
      data,
      // Headers já definidos no create, mas mantemos aqui para garantir override se necessário
    };
  };

  request(options) {
    return new Promise((resolve, reject) => {
      this._axios
        .request(options)
        .then((res) => resolve(res.data))
        .catch((ex) => {
          // 1. Verifica se existe uma resposta do servidor (erro de API, ex: 401, 404, 500)
          if (ex.response && ex.response.data) {
            reject(ex.response.data);
          } else {
            // 2. Se não houver resposta, é um erro de rede ou CORS
            console.error("[HttpService] Erro de conexão:", ex);
            reject({ message: ex.message || "Erro de rede ou servidor indisponível." });
          }
        });
    });
  }
}

export default new HttpService();