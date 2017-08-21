
import {injectorBridge} from "../../../angular/angular-injector-bridge.functions";
import {States} from "../../../states.service";
import {collapsedGroupClass, hierarchyGroupClass, hierarchyRootClass} from "../../helpers/wp-table-hierarchy-helpers";
import {WorkPackageTable} from "../../wp-fast-table";
import {WorkPackageTableHierarchiesService} from './../../state/wp-table-hierarchy.service';
import {WorkPackageTableHierarchies} from "../../wp-table-hierarchies";
import {indicatorCollapsedClass} from "../../builders/modes/hierarchy/single-hierarchy-row-builder";
import {rowClassName} from '../../builders/rows/single-row-builder';
import {debugLog} from '../../../../helpers/debug_output';

export class HierarchyTransformer {
  public wpTableHierarchies:WorkPackageTableHierarchiesService;
  public states:States;

  constructor(table:WorkPackageTable) {
    injectorBridge(this);
    let enabled = this.wpTableHierarchies.isEnabled;

    this.states.updates.hierarchyUpdates
      .values$('Refreshing hierarchies on user request')
      .subscribe((state: WorkPackageTableHierarchies) => {
        if (enabled !== state.isEnabled) {
          table.redrawTableAndTimeline();
        } else if (enabled) {
          // No change in hierarchy mode
          // Refresh groups
          this.renderHierarchyState(state);
        }

        enabled = state.isEnabled;
    });
  }

  /**
   * Update all currently visible rows to match the selection state.
   */
  private renderHierarchyState(state:WorkPackageTableHierarchies) {
    const rendered = this.states.table.rendered.value!;

   // Show all hierarchies
   jQuery('[class^="__hierarchy-group-"]').removeClass((i:number, classNames:string):string => {
    return (classNames.match(/__collapsed-group-\d+/g) || []).join(' ');
   });

   // Hide all collapsed hierarchies
   _.each(state.collapsed, (isCollapsed:boolean, wpId:string) => {


     if(isCollapsed) {
       console.log(isCollapsed, wpId);
       let timelineElm = jQuery(`.wp-table-timeline--body .${hierarchyGroupClass(wpId)}`);
       console.log('timelineElm: ', timelineElm);
       jQuery(`#wp-timeline-row-${wpId}`).addClass('collapsed-timeline-chart');

      /* Clone the HTML bar chart elements */
      for(let i = 0; i < timelineElm.length; i++) {
        console.dir(timelineElm[i]);

        if (timelineElm[i].className.indexOf('__collapsed-group-') === -1) {
          jQuery(timelineElm[i]).clone().appendTo(`#wp-timeline-row-${wpId}`);
        }
      }
    } else {
      jQuery(`#wp-timeline-row-${wpId}`).removeClass('collapsed-timeline-chart');
      // console.log('ELEMENT: ', jQuery(`#wp-timeline-row-${wpId} [class^="__hierarchy-group-"]`));
      console.log('ELEMENT: ', jQuery(`#wp-timeline-row-${wpId} .wp-timeline-cell`));
      jQuery(`#wp-timeline-row-${wpId} .wp-timeline-cell`).remove();
      // jQuery(`#wp-timeline-row-${wpId} '[class^="__hierarchy-group-"]'`).remove();
    }

    //  console.log(jQuery(`.${hierarchyRootClass(wpId)})`));

     // Toggle the root style
     jQuery(`.${hierarchyRootClass(wpId)} .wp-table--hierarchy-indicator`).toggleClass(indicatorCollapsedClass, isCollapsed);

     // Get all affected rows
     const affected = jQuery(`.${hierarchyGroupClass(wpId)}`);

     // Hide/Show the descendants.
     affected.toggleClass(collapsedGroupClass(wpId), isCollapsed);

     // Update the hidden section of the rendered state
     affected.filter(`.${rowClassName}`).each((i, el) => {
       // Get the index of this row
       const index = jQuery(el).index();

       // Update the hidden state
       rendered.renderedOrder[index].hidden = isCollapsed;
     });
   });

   this.states.table.rendered.putValue(rendered, 'Updated hidden state of rows after hierarchy change.');
  }
}

HierarchyTransformer.$inject = ['wpTableHierarchies', 'states'];
