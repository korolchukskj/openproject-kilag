import {debugLog} from "../../../../helpers/debug_output";
import {injectorBridge} from "../../../angular/angular-injector-bridge.functions";
import {WorkPackageTable} from "../../wp-fast-table";
import {TableEventHandler} from "../table-handler-registry";
import {rowClassName} from "../../builders/rows/single-row-builder";
import {uiStateLinkClass} from "../../builders/ui-state-link-builder";
import {ContextMenuService} from "../../../context-menus/context-menu.service";
import {timelineCellClassName} from "../../builders/timeline/timeline-row-builder";

export class ContextMenuHandler implements TableEventHandler {
  // Injections
  public contextMenu:ContextMenuService;

  constructor(table: WorkPackageTable) {
    injectorBridge(this);
  }

  public get EVENT() {
    return 'contextmenu.table.rightclick';
  }

  public get SELECTOR() {
    return `.${rowClassName},.${timelineCellClassName}`;
  }

  public eventScope(table:WorkPackageTable) {
    return jQuery(table.container);
  }

  public handleEvent(table: WorkPackageTable, evt:JQueryEventObject):boolean {
    let target = jQuery(evt.target);

    // We want to keep the original context menu on hrefs
    // (currently, this is only the id
    if (target.closest(`.${uiStateLinkClass}`).length) {
      debugLog('Allowing original context menu on state link');
      return true;
    }
    evt.preventDefault();
    evt.stopPropagation();

    // Locate the row from event
    let element = target.closest(this.SELECTOR);
    let row = table.rowObject(element.data('workPackageId'));

    this.contextMenu.activate('WorkPackageContextMenu', evt, {row: row, table: table});
    return false;
  }
}

ContextMenuHandler.$inject = ['contextMenu'];
