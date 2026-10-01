/**
 * motionUpstreamStages — the studio's upstream projection, INTERNAL
 * to the plugin (the export-discipline law, card-view-vs-dsh-web
 * audit: a UI plugin exports no values beyond what cordis loading
 * needs; pure helpers stay internal, testable from this module).
 */
import {
  projectUpstreamStages,
  type CardStage,
  type StageViewOwnerProps,
} from '@melite/contracts'

/** The bench's upstream rows filtered to the host-declared prior
 * stages (priorStageIds absent = every upstream, the host's own
 * law).
 * @param props the owner props' upstream pair */
export function motionUpstreamStages(
  props: Pick<StageViewOwnerProps, 'upstream' | 'priorStageIds'>,
): CardStage[] {
  const priorIds = props.priorStageIds === undefined
    ? null
    : new Set(props.priorStageIds)
  return projectUpstreamStages(props).filter(
    (upstream) => priorIds === null || priorIds.has(upstream.id),
  )
}
