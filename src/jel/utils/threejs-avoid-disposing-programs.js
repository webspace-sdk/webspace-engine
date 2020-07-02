// For Jel, we do not want to dispose any programs, to avoid complilation mid-session.
export default function patchThreeNoProgramDispose() {
  const renderer = AFRAME.scenes[0].renderer;
  const programs = renderer.info.programs;

  const push = programs.push.bind(programs);

  // Hijack the array.push to increment the used times :P
  programs.push = function(o) {
    o.usedTimes++;
    return push(o);
  };
}
