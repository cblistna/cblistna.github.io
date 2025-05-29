"use strict";

const ACCESS_TOKEN_SUFFIX = ".AccessToken";
const ACCESS_TOKEN_EXPIRES_AT_SUFFIX = ".AccessTokenExpiresAt";

export class GoogleAccess {
  constructor(name, clientId, clientSecret, refreshToken) {
    this.name = name;
    this.accessTokenKey = `${name}${ACCESS_TOKEN_SUFFIX}`;
    this.accessTokenExpiresAtKey = `${name}${ACCESS_TOKEN_EXPIRES_AT_SUFFIX}`;
    this.authData = {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };
    this.accessToken = "";
    this.accessTokenExpiresAt = 0;
  }

  async eventsOf(calendar, query) {
    await this.#ensureFreshAccessToken();
    return await this.#getJson(
      `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events`,
      query
    );
  }

  async filesOf(query) {
    await this.#ensureFreshAccessToken();
    return await this.#getJson(
      "https://www.googleapis.com/drive/v3/files",
      query
    );
  }

  async dataOf(spreadsheetId, range) {
    await this.#ensureFreshAccessToken();
    return await this.#getJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      }
    );
  }

  #ensureFreshAccessToken() {
    return new Promise((resolve, reject) => {
      const nowMs = Date.now();
      if (!this.accessTokenExpiresAt) {
        this.accessToken = sessionStorage.getItem(this.accessTokenKey) || "";
        this.accessTokenExpiresAt =
          Number(sessionStorage.getItem(this.accessTokenExpiresAtKey)) ||
          nowMs - 1;
      }
      if (this.accessTokenExpiresAt < nowMs) {
        this.#postJson(
          "https://www.googleapis.com/oauth2/v4/token",
          this.authData
        )
          .then((auth) => {
            this.accessToken = auth.access_token;
            this.accessTokenExpiresAt = nowMs + auth.expires_in * 1000;
            sessionStorage.setItem(this.accessTokenKey, this.accessToken);
            sessionStorage.setItem(
              this.accessTokenExpiresAtKey,
              String(this.accessTokenExpiresAt)
            );
            console.debug(`access token refreshed for '${this.name}'`);
            resolve(this.accessToken);
          })
          .catch(reject);
      } else {
        resolve(this.accessToken);
      }
    });
  }

  async #postJson(url, data) {
    const body = new URLSearchParams(data).toString();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw await res.text();
    return await res.json();
  }

  async #getJson(url, query) {
    const params = query ? "?" + new URLSearchParams(query).toString() : "";
    const res = await fetch(url + params, {
      method: "GET",
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw await res.text();
    return await res.json();
  }
}
