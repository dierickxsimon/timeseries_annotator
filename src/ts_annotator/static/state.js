/**
 * Compute the output label array from annotations.
 *
 * Aggregates individual annotations per label into a consistent output format:
 * - point labels: list of ints
 * - range labels: list of [start, end]
 *
 * @param {object[]} labels - Label configs with .id, .name, .color, .type.
 * @param {object[]} annotations - Placed annotations with .labelId, .type, .value.
 * @returns {object[]} Output labels with filled-in values.
 */
export function computeOutput(labels, annotations) {
  return labels.map((label) => {
    const mine = annotations.filter((a) => a.labelId === label.id);
    let value = null;

    if (label.type === "point") {
      value = mine.length > 0 ? mine.map((a) => a.value) : null;
    } else {
      value = mine.length > 0 ? mine.map((a) => a.value) : null;
    }

    return { name: label.name, color: label.color, type: label.type, value };
  });
}
