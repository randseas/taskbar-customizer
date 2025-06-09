/* extension.js
 * TaskbarCustomizer - GNOME Shell Extension
 */
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import St from "gi://St";
import GLib from "gi://GLib";
import Clutter from "gi://Clutter";
import AccountsService from "gi://AccountsService";
import GObject from "gi://GObject";
import { Avatar } from "resource:///org/gnome/shell/ui/userWidget.js";
import {
  QuickSettingsItem,
  SystemIndicator,
} from "resource:///org/gnome/shell/ui/quickSettings.js";

const QuickSettingsMenu = Main.panel.statusArea.quickSettings;

const AvatarItem = GObject.registerClass(
  class AvatarItem extends QuickSettingsItem {
    _init(settings) {
      super._init({
        style_class: "avatar-button",
        canFocus: true,
        hasMenu: false,
      });
      this._user = AccountsService.UserManager.get_default().get_user(
        GLib.get_user_name()
      );
      this._container = new St.BoxLayout({
        y_align: Clutter.ActorAlign.CENTER,
        x_align: Clutter.ActorAlign.CENTER,
        vertical: false,
        style: "height: 100%; width: 100%;",
      });
      this.set_y_align(Clutter.ActorAlign.CENTER);
      this.set_child(this._container);
      const iconSize =
        37;
      this._avatarPicture = new Avatar(this._user, {
        iconSize,
        styleClass: "avatar-picture",
      });
      this._avatarPicture.style = `icon-size: ${iconSize}px;`;
      this._container.add_child(this._avatarPicture);
      this._container.reactive = true;
      this._container.connect("button-press-event", (actor, event) => {
        GLib.spawn_command_line_async("gnome-control-center users");
        return Clutter.EVENT_STOP;
      });
      this._user.connectObject("changed", this._updateAvatar.bind(this), this);
    }
    _updateAvatar() {
      this._avatarPicture.update();
    }
  }
);
const Indicator = GObject.registerClass(
  class Indicator extends SystemIndicator {
    _init(settings) {
      super._init();
      this.settings = settings;
      this._load();
    }
    _load() {
      this._avatarItem = new AvatarItem(this.settings);
      this.systemItemsBox = QuickSettingsMenu._system._systemItem.child;
      if (this.systemItemsBox) {
        this.systemItemsBox.insert_child_at_index(this._avatarItem, 0);
      }
      this.connect("destroy", () => {
        this._avatarItem.destroy();
      });
    }
  }
);

export default class TaskbarCustomizer extends Extension {
  _timeoutId = 0;
  _customDateButton = null;
  _openId = 0;

  _showSeconds = false;

  enable() {
    if (QuickSettingsMenu._system) {
      this._indicator = new Indicator({ avatarSize: 43 });
    }
    Main.panel.statusArea["a11y"].container.hide();
    const quickSettings = Main.panel.statusArea.quickSettings;
    const dateMenu = Main.panel.statusArea.dateMenu;
    if (!quickSettings || !dateMenu) return;
    quickSettings.actor.add_style_class_name("quickSettings-wrapper");
    quickSettings.menu.connect("open-state-changed", (menu, isOpen) => {
      if (isOpen) {
        quickSettings.actor.add_style_class_name("open");
      } else {
        quickSettings.actor.remove_style_class_name("open");
      }
    });
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
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
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
