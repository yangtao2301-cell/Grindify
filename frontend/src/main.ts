/*
 * Copyright (c) 2026 FalkenDev
 *
 * This file is part of Grindify.
 *
 * Grindify is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with Grindify. If not, see
 * <https://www.gnu.org/licenses/>.
 */

/**
 * main.ts
 *
 * 初始化 Vuetify 和其他插件，然后挂载 App。
 */

// 插件
import { registerPlugins } from '@/plugins';

// 组件
import App from './App.vue';

// 组合式函数
import { createApp } from 'vue';

// 样式
import 'unfonts.css';

const app = createApp(App);

registerPlugins(app);

app.mount('#app');
