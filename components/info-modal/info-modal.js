Component({
  options: {
    multipleSlots: false
  },
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: '信息'
    },
    // 可传入初始数据 { on: true/false, date: 'YYYY-MM-DD', time: 'HH:mm', note: '...' }
    data: {
      type: Object,
      value: {}
    }
  },
  data: {
    form: {
      on: true,
      date: '',
      time: '',
      note: ''
    },
    panelAnim: null
  },
  observers: {
    visible(val) {
      if (val) this._openInit();
    },
    data(val) {
      if (val) this.setData({
        form: Object.assign({}, this.data.form, val)
      });
    }
  },
  methods: {
    noop() { /* 阻止冒泡 */ },

    // 初始化 open 动画 & 填入 data
    _openInit() {
      // 如果 data 属性有值，覆盖 form
      const incoming = this.properties.data || {};
      this.setData({
        form: Object.assign({}, this.data.form, incoming)
      });

      // 简单面板 enter 动画（从底部上来）
      const animation = wx.createAnimation({duration: 180, timingFunction: 'ease-out'});
      animation.translateY(0).step();
      this.setData({ panelAnim: animation.export() });
    },

    onMaskTap() {
      // 点击遮罩关闭（可选）
      this.triggerEvent('cancel');
      this.setData({ visible: false });
    },

    onCancel() {
      this.triggerEvent('cancel');
      this.setData({ visible: false });
    },

    onConfirm() {
      // 合并日期+时间 -> timestamp 字符串
      const f = this.data.form;
      let datetime = '';
      if (f.date && f.time) {
        datetime = `${f.date} ${f.time}`;
      } else if (f.date) {
        datetime = `${f.date} 00:00`;
      } else if (f.time) {
        // 没有日期则用今日
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth()+1).padStart(2,'0');
        const d = String(today.getDate()).padStart(2,'0');
        datetime = `${y}-${m}-${d} ${f.time}`;
      }

      const result = {
        on: f.on,
        date: f.date,
        time: f.time,
        datetime,
        note: f.note || ''
      };

      this.triggerEvent('confirm', result);
      this.setData({ visible: false });
    },

    onToggleChange(e) {
      const v = e.detail.value;
      this.setData({ 'form.on': v });
    },

    onDateChange(e) {
      const v = e.detail.value; // YYYY-MM-DD
      this.setData({ 'form.date': v });
    },

    onTimeChange(e) {
      const v = e.detail.value; // HH:mm
      this.setData({ 'form.time': v });
    },

    onNoteInput(e) {
      this.setData({ 'form.note': e.detail.value });
    },

    // 外部调用：open 并带 data
    open(data = {}) {
      this.setData({
        visible: true,
        data: data
      });
    },

    // 外部调用：close
    close() {
      this.setData({ visible: false });
    }
  }
});
