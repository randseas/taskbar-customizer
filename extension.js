/* extension.js
 *
 * Bu örnek GNOME Shell extension için sağ alt köşede animasyonlu tarih menüsü açar.
 */

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import St from "gi://St";
import GLib from "gi://GLib";
import Clutter from "gi://Clutter";

export default class HideAccessibilityMenu extends Extension {
  _timeoutId = 0;
  _customDateButton = null;
  _openId = 0;

  _showSeconds = false;

  enable() {
    Main.panel.statusArea["a11y"].container.hide();
    const quickSettings = Main.panel.statusArea.quickSettings;
    const dateMenu = Main.panel.statusArea.dateMenu;
    if (!quickSettings || !dateMenu) return;
    quickSettings.actor.add_style_class_name("quickSettings-wrapper");
    const rightBox = Main.panel._rightBox;
    dateMenu.container.visible = false;
    dateMenu.container.set_opacity(0);
    dateMenu.container.set_width(0);
    dateMenu.container.set_height(0);
    this._customDateButton = new St.Button({
      style_class: "custom-date-wrapper",
      reactive: true,
      can_focus: true,
      track_hover: true,
    });
    const label = new St.Label({
      style_class: "custom-date-label",
      x_expand: true,
    });
    this._customDateButton.set_child(label);
    this._customDateButton.connect("clicked", () => {
      if (dateMenu.menu.isOpen) {
        const menuActor = dateMenu.menu.actor;
        menuActor.ease({
          opacity: 0,
          duration: 200,
          mode: Clutter.AnimationMode.EASE_IN_QUAD,
          onComplete: () => {
            dateMenu.menu.close();
          },
        });
      } else {
        const onOpen = (menu, isOpen) => {
          if (isOpen) {
            const monitor = Main.layoutManager.primaryMonitor;
            const menuActor = dateMenu.menu.actor;
            const x = monitor.x + monitor.width - menuActor.width - 6;
            const y = monitor.y + monitor.height - menuActor.height - 63;
            menuActor.set_position(x, y + 5);
            menuActor.opacity = 0;
            menuActor.ease({
              y: y,
              opacity: 255,
              duration: 220,
              mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
            this._customDateButton.add_style_pseudo_class("focus");
          } else {
            this._customDateButton.remove_style_pseudo_class("focus");
            dateMenu.menu.disconnect(this._openId);
          }
        };
        this._openId = dateMenu.menu.connect("open-state-changed", onOpen);
        dateMenu.menu.open();
      }
    });
    rightBox.add_child(this._customDateButton);
    const updateDateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: this._showSeconds ? "2-digit" : undefined,
        hour12: false,
      });
      label.text = `${timeStr}\n${dateStr}`;
      return GLib.SOURCE_CONTINUE;
    };
    updateDateTime();
    this._timeoutId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      this._showSeconds ? 1 : 60,
      updateDateTime
    );
  }
  disable() {
    Main.panel.statusArea["a11y"].container.show();
    if (this._timeoutId) {
      GLib.source_remove(this._timeoutId);
      this._timeoutId = 0;
    }
    if (this._customDateButton) {
      const parent = this._customDateButton.get_parent();
      if (parent) parent.remove_child(this._customDateButton);
      this._customDateButton = null;
    }
    const dateMenu = Main.panel.statusArea.dateMenu;
    if (dateMenu) {
      dateMenu.container.visible = true;
      dateMenu.container.set_opacity(255);
      dateMenu.container.set_width(-1);
      dateMenu.container.set_height(-1);
    }
  }
}
