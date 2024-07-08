import { paths } from "../paths";
import { sets } from "../sets";
import { xforms } from "./xforms";
import { addSetsToBindings } from "./utils";

// import { Pose } from "../pose";

const wasd_vec2 = "/var/mouse-and-keyboard/wasd_vec2";
const keyboardCharacterAcceleration = "/var/mouse-and-keyboard/keyboardCharacterAcceleration";
const arrows_vec2 = "/var/mouse-and-keyboard/arrows_vec2";
const togglePenWithRMB = "/vars/mouse-and-keyboard/drop_pen_with_RMB";
const togglePenWithEsc = "/vars/mouse-and-keyboard/drop_pen_with_esc";
const togglePenWithHud = "/vars/mouse-and-keyboard/drop_pen_with_hud";
const togglePen = "/vars/mouse-and-keyboard/togglePen";
const grabViaKeyboard = "/vars/mouse-and-keyboard/grabViaKeyboard";
const grabViaMouse = "/vars/mouse-and-keyboard/grabViaMouse";
const dropViaKeyboard = "/vars/mouse-and-keyboard/dropViaKeyboard";
const dropViaMouse = "/vars/mouse-and-keyboard/dropViaMouse";
const editViaKeyboard1 = "/vars/mouse-and-keyboard/editViaKeyboard1";
const editViaKeyboard2 = "/vars/mouse-and-keyboard/editViaKeyboard2";
const notControlSpace = "/vars/mouse-and-keyboard/notControlSpace";

const qs = new URLSearchParams(location.search);
const inspectZoomSpeed = parseFloat(qs.get("izs")) || -20.0;
const controlM = "/var/control+m";
const movementX = "/var/movementX";
const movementY = "/var/movementY";
const inspectPanning = "/var/inspect-pan";
const panX = "/var/middle-mouse-move-x";
const panY = "/var/middle-mouse-move-y";
const rightMouseMoveX = "/var/right-mouse-move-x";
const rightMouseMoveY = "/var/right-mouse-move-y";
const cursorScalePenTipWheel = "/var/cursorScalePenTipWheel";

const kMap = new Map();
const k = name => {
  if (!kMap.has(name)) {
    kMap.set(name, `/keyboard-mouse-user/keyboard-var/${name}`);
  }
  return kMap.get(name);
};

export const keyboardMouseUserBindings = addSetsToBindings({
  [sets.global]: [
    {
      src: {},
      dest: { value: paths.actions.cursor.right.hideLine },
      xform: xforms.always(true)
    },
    {
      src: {},
      dest: { value: paths.actions.cursor.right.wake },
      xform: xforms.always(true)
    },
    {
      src: {},
      dest: { value: paths.actions.cursor.left.wake },
      xform: xforms.always(false)
    },
    {
      src: {
        q: paths.device.keyboard.code("keyq"),
        e: paths.device.keyboard.code("keye")
      },
      dest: { scalar: paths.actions.characterLift },
      xform: xforms.qe_to_scalar
    },
    {
      src: {
        w: paths.device.keyboard.key("arrowup"),
        a: paths.device.keyboard.key("arrowleft"),
        s: paths.device.keyboard.key("arrowdown"),
        d: paths.device.keyboard.key("arrowright")
      },
      dest: { vec2: arrows_vec2 },
      xform: xforms.wasd_to_vec2
    },
    {
      src: {
        w: paths.device.keyboard.code("keyw"),
        a: paths.device.keyboard.code("keya"),
        s: paths.device.keyboard.code("keyo"),
        d: paths.device.keyboard.code("keyd")
      },
      dest: { vec2: wasd_vec2 },
      xform: xforms.wasd_to_vec2
    },
    {
      src: {
        first: wasd_vec2,
        second: arrows_vec2
      },
      dest: { value: keyboardCharacterAcceleration },
      xform: xforms.max_vec2
    },
    {
      src: { value: keyboardCharacterAcceleration },
      dest: { value: paths.actions.characterAcceleration },
      xform: xforms.normalize_vec2
    },
    {
      src: { value: paths.device.mouse.wheel },
      dest: { value: paths.actions.equipScroll },
      xform: xforms.copy
    },
    {
      src: { value: paths.device.keyboard.key("shift") },
      dest: { value: paths.actions.boost },
      xform: xforms.copy,
      priority: 1001
    },
    {
      src: { value: paths.device.hud.penButton },
      dest: { value: togglePenWithHud },
      xform: xforms.rising
    },
    {
      src: [togglePenWithHud],
      dest: { value: togglePen },
      xform: xforms.any
    },
    {
      src: { value: togglePen },
      dest: { value: paths.actions.spawnPen },
      xform: xforms.rising,
      priority: 100
    },
    {
      src: { value: paths.device.smartMouse.cursorPose },
      dest: { value: paths.actions.cursor.right.pose },
      xform: xforms.copy
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.key(" ")
      },
      dest: { value: notControlSpace },
      priority: 1001,
      xform: xforms.copyIfFalse
    },
    {
      src: {
        value: notControlSpace
      },
      dest: { value: paths.actions.mash },
      priority: 1001,
      xform: xforms.rising
    },
    {
      src: {
        value: notControlSpace
      },
      dest: { value: paths.actions.mashRelease },
      priority: 1001,
      xform: xforms.falling
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("keym")
      },
      dest: { value: controlM },
      priority: 1001,
      xform: xforms.copyIfTrue
    },
    {
      src: {
        value: controlM
      },
      dest: {
        value: paths.actions.muteMic
      },
      xform: xforms.rising
    },
    {
      src: {
        value: paths.device.keyboard.code("keyp")
      },
      dest: {
        value: paths.actions.logDebugFrame
      },
      xform: xforms.rising
    },
    {
      src: {
        value: paths.device.keyboard.code("keyk")
      },
      dest: {
        value: paths.actions.logInteractionState
      },
      xform: xforms.rising
    },
    {
      src: {
        value: paths.device.keyboard.key("?")
      },
      dest: {
        value: paths.actions.toggleKeyTips
      },
      xform: xforms.rising
    },
    {
      src: { value: "/var/naked+r" },
      dest: { value: paths.actions.mediaTransformReleaseAction },
      xform: xforms.falling,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("alt"),
        value: paths.device.keyboard.code("keyv")
      },
      dest: { value: "/var/naked+v" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyb") },
      dest: { value: "/var/rising+b" },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("alt"),
        value: "/var/rising+b"
      },
      dest: { value: "/var/rising+b+noalt" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: "/var/rising+b+noalt"
      },
      dest: { value: "/var/naked+b" },
      xform: xforms.copyIfFalse,
      priority: 1001
    }, // ctrl+B and alt+B both bound, so need extra element
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("keyb")
      },
      dest: { value: "/var/control+b" },
      xform: xforms.copyIfTrue,
      priority: 1001
    }, // ctrl+B and alt+B both bound, so need extra element
    {
      src: { value: "/var/control+b" },
      dest: { value: paths.actions.toggleTriggerMode },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyc") },
      dest: { value: "/var/rising+c" },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("alt"),
        value: "/var/rising+c"
      },
      dest: { value: "/var/naked+c" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyt") },
      dest: { value: "/var/rising+t" },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("alt"),
        value: "/var/rising+t"
      },
      dest: { value: "/var/naked+t" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyl") },
      dest: { value: "/var/rising+l" },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("alt"),
        value: "/var/rising+l"
      },
      dest: { value: "/var/naked+l" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("alt"),
        value: paths.device.keyboard.code("keyr")
      },
      dest: { value: "/var/naked+r" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyg") },
      dest: { value: "/var/rising+g" },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("alt"),
        value: "/var/rising+g"
      },
      dest: { value: "/var/naked+g" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyz") },
      dest: { value: "/var/rising+z" },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("alt"),
        value: "/var/rising+z"
      },
      dest: { value: "/var/rising+z+noalt" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: "/var/rising+z+noalt"
      },
      dest: { value: "/var/naked+z" },
      xform: xforms.copyIfFalse,
      priority: 1001
    }, // ctrl+Z and alt+z both bound, so need extra element
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("keyz")
      },
      dest: { value: "/var/control+z" },
      xform: xforms.copyIfTrue,
      priority: 1001
    }, // ctrl+Z and alt+z both bound, so need extra element
    {
      src: { value: "/var/control+z" },
      dest: { value: paths.actions.undo },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyy") },
      dest: { value: "/var/rising+y" },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: "/var/rising+y"
      },
      dest: { value: "/var/naked+y" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("keyy")
      },
      dest: { value: "/var/control+y" },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: { value: "/var/control+y" },
      dest: { value: paths.actions.redo },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: "/var/naked+v" },
      dest: { value: paths.actions.mediaScaleReleaseAction },
      xform: xforms.falling
    },
    {
      src: { value: paths.device.keyboard.key("/") },
      dest: { value: paths.actions.create },
      xform: xforms.rising
    },
    {
      src: { value: paths.device.keyboard.code("digit1") },
      dest: { value: "/var/rising+1" },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: "/var/rising+1"
      },
      dest: { value: "/var/naked+1" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("digit1")
      },
      dest: { value: "/var/control+1" },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: { value: "/var/control+1" },
      dest: { value: paths.actions.equip1 },
      xform: xforms.rising
    },
    {
      src: { value: paths.device.keyboard.code("digit2") },
      dest: { value: "/var/rising+2" },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: "/var/rising+2"
      },
      dest: { value: "/var/naked+2" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("digit2")
      },
      dest: { value: "/var/control+2" },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: { value: "/var/control+2" },
      dest: { value: paths.actions.equip2 },
      xform: xforms.rising
    },
    {
      src: { value: paths.device.keyboard.code("digit3") },
      dest: { value: "/var/rising+3" },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: "/var/rising+3"
      },
      dest: { value: "/var/naked+3" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("digit3")
      },
      dest: { value: "/var/control+3" },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: { value: "/var/control+3" },
      dest: { value: paths.actions.equip3 },
      xform: xforms.rising
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("digit4")
      },
      dest: { value: "/var/control+4" },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: { value: "/var/control+4" },
      dest: { value: paths.actions.equip4 },
      xform: xforms.rising
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("digit5")
      },
      dest: { value: "/var/control+5" },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: { value: "/var/control+5" },
      dest: { value: paths.actions.equip5 },
      xform: xforms.rising
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("digit6")
      },
      dest: { value: "/var/control+6" },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: { value: "/var/control+6" },
      dest: { value: paths.actions.equip6 },
      xform: xforms.rising
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("digit7")
      },
      dest: { value: "/var/control+7" },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: { value: "/var/control+7" },
      dest: { value: paths.actions.equip7 },
      xform: xforms.rising
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("digit8")
      },
      dest: { value: "/var/control+8" },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: { value: "/var/control+8" },
      dest: { value: paths.actions.equip8 },
      xform: xforms.rising
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("digit9")
      },
      dest: { value: "/var/control+9" },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: { value: "/var/control+9" },
      dest: { value: paths.actions.equip9 },
      xform: xforms.rising
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.keyboard.code("digit0")
      },
      dest: { value: "/var/control+0" },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: { value: "/var/control+0" },
      dest: { value: paths.actions.equip0 },
      xform: xforms.rising
    }
    // Helpful bindings for debugging hands in 2D
    // {
    //   src: {},
    //   dest: { value: paths.actions.rightHand.matrix },
    //   xform: xforms.always(
    //     new THREE.Matrix4().compose(
    //       new THREE.Vector3(0.2, 1.3, -0.8),
    //       new THREE.Quaternion(0, 0, 0, 0),
    //       new THREE.Vector3(1, 1, 1)
    //     )
    //   )
    // },
    // {
    //   src: {},
    //   dest: { value: paths.actions.leftHand.matrix },
    //   xform: xforms.always(
    //     new THREE.Matrix4().compose(
    //       new THREE.Vector3(-0.2, 1.4, -0.8),
    //       new THREE.Quaternion(0, 0, 0, 0),
    //       new THREE.Vector3(1, 1, 1)
    //     )
    //   )
    // }
  ],

  [sets.rightCursorHoldingPen]: [
    {
      src: { value: paths.device.mouse.buttonLeft },
      dest: { value: paths.actions.cursor.right.startDrawing },
      xform: xforms.rising,
      priority: 3
    },
    {
      src: { value: paths.device.mouse.buttonLeft },
      dest: { value: paths.actions.cursor.right.stopDrawing },
      xform: xforms.falling,
      priority: 3
    },
    {
      src: {
        value: k("wheelWithControl")
      },
      dest: { value: cursorScalePenTipWheel },
      xform: xforms.copy,
      priority: 200
    },
    {
      src: { value: cursorScalePenTipWheel },
      dest: { value: paths.actions.cursor.right.scalePenTip },
      xform: xforms.scale(0.03)
    },
    {
      src: { value: paths.device.mouse.buttonRight },
      dest: { value: togglePenWithRMB },
      xform: xforms.falling,
      priority: 200
    },
    {
      src: { value: paths.device.keyboard.key("Escape") },
      dest: { value: togglePenWithEsc },
      xform: xforms.rising
    },
    {
      src: [togglePenWithRMB, togglePenWithEsc, togglePenWithHud],
      dest: { value: togglePen },
      xform: xforms.any
    },
    {
      src: { value: togglePen },
      dest: { value: paths.actions.cursor.right.drop },
      xform: xforms.rising,
      priority: 200
    },
    {
      src: { value: togglePen },
      dest: { value: paths.actions.pen.remove },
      xform: xforms.rising,
      priority: 200
    }
  ],

  [sets.rightCursorHoldingCamera]: [
    {
      src: { value: paths.device.mouse.buttonLeft },
      dest: { value: paths.actions.cursor.right.drop },
      xform: xforms.falling,
      priority: 2
    },
    {
      src: {
        value: k("wheelWithControl")
      },
      dest: { value: paths.actions.cursor.right.scaleGrabbedGrabbable },
      xform: xforms.noop,
      priority: 2
    }
  ],

  [sets.rightCursorHoldingInteractable]: [
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.mouse.wheel
      },
      dest: {
        value: k("wheelWithControl")
      },
      xform: xforms.copyIfTrue,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("control"),
        value: paths.device.mouse.wheel
      },
      dest: {
        value: k("wheelWithoutControl")
      },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: {
        value: k("wheelWithoutControl")
      },
      dest: { value: paths.actions.cursor.right.modDelta },
      xform: xforms.copy
    },
    {
      src: {
        value: k("wheelWithControl")
      },
      dest: { value: paths.actions.cursor.right.scaleGrabbedGrabbable },
      xform: xforms.copy
    },
    {
      src: { value: paths.device.mouse.buttonRight },
      dest: { value: dropViaMouse },
      xform: xforms.falling,
      priority: 2
    },
    {
      src: { value: paths.device.keyboard.key("tab") },
      dest: { value: dropViaKeyboard },
      xform: xforms.falling,
      priority: 2
    },
    {
      src: [dropViaMouse, dropViaKeyboard],
      dest: { value: paths.actions.cursor.right.drop },
      xform: xforms.any,
      priority: 201
    },
    {
      src: { value: paths.device.keyboard.code("keyq") },
      dest: { value: paths.actions.mediaSlideAction },
      xform: xforms.copy,
      priority: 201
    },
    {
      src: { value: paths.device.keyboard.code("keyq") },
      dest: { value: paths.actions.mediaSlideReleaseAction },
      xform: xforms.falling,
      priority: 201
    },
    {
      src: { value: paths.device.keyboard.code("keye") },
      dest: { value: paths.actions.mediaLiftAction },
      xform: xforms.copy,
      priority: 201
    },
    {
      src: { value: paths.device.keyboard.code("keye") },
      dest: { value: paths.actions.mediaLiftReleaseAction },
      xform: xforms.falling,
      priority: 201
    },
    {
      src: { value: "/var/naked+1" },
      dest: { value: paths.actions.mediaMoveXAction },
      xform: xforms.copy,
      priority: 201
    },
    {
      src: { value: "/var/naked+2" },
      dest: { value: paths.actions.mediaMoveYAction },
      xform: xforms.copy,
      priority: 201
    },
    {
      src: { value: "/var/naked+3" },
      dest: { value: paths.actions.mediaMoveZAction },
      xform: xforms.copy,
      priority: 201
    }
  ],
  [sets.rightCursorHoldingUI]: [
    {
      src: { value: paths.device.mouse.buttonLeft },
      dest: { value: paths.actions.cursor.right.drop },
      xform: xforms.falling,
      priority: 3
    },
    {
      src: { value: paths.device.keyboard.key("control") },
      dest: { value: paths.actions.transformModifier },
      xform: xforms.copy,
      priority: 1
    }
  ],
  [sets.rightCursorHoveringOnInteractable]: [
    {
      src: { value: paths.device.mouse.buttonRight },
      dest: { value: grabViaMouse },
      xform: xforms.rising,
      priority: 2
    },
    {
      src: { value: paths.device.keyboard.key("tab") },
      dest: { value: grabViaKeyboard },
      xform: xforms.rising,
      priority: 2
    },
    {
      src: [grabViaMouse, grabViaKeyboard],
      dest: { value: paths.actions.cursor.right.grab },
      xform: xforms.any,
      priority: 201
    },
    {
      src: { value: paths.device.keyboard.code("keyf") },
      dest: { value: "/var/rising+f" },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: {
        bool: paths.device.keyboard.key("alt"),
        value: "/var/rising+f"
      },
      dest: { value: "/var/naked+f" },
      xform: xforms.copyIfFalse,
      priority: 1001
    },
    {
      src: { value: "/var/naked+f" },
      dest: { value: paths.actions.toggleInspecting },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keys") },
      dest: { value: paths.actions.mediaOpenAction },
      xform: xforms.rising,
      priority: 201
    },
    {
      src: { value: paths.device.keyboard.code("backquote") },
      dest: { value: editViaKeyboard1 },
      xform: xforms.rising,
      priority: 201
    },
    {
      src: { value: paths.device.keyboard.key("@") },
      dest: { value: editViaKeyboard2 },
      xform: xforms.rising,
      priority: 201
    },
    {
      src: [editViaKeyboard1, editViaKeyboard2],
      dest: { value: paths.actions.mediaEditAction },
      xform: xforms.any,
      priority: 400
    },
    {
      src: { value: paths.device.keyboard.code("keyq") },
      dest: { value: paths.actions.mediaBackAction },
      xform: xforms.rising
    },
    {
      src: { value: paths.device.keyboard.code("keye") },
      dest: { value: paths.actions.mediaNextAction },
      xform: xforms.rising
    },
    {
      src: { value: "/var/naked+t" },
      dest: { value: paths.actions.mediaUpAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: "/var/naked+g" },
      dest: { value: paths.actions.mediaDownOrResetAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: "/var/naked+b" },
      dest: { value: paths.actions.mediaSnapshotAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: "/var/naked+r" },
      dest: { value: paths.actions.mediaRotateAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: "/var/naked+v" },
      dest: { value: paths.actions.mediaScaleAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyx") },
      dest: { value: paths.actions.mediaRemoveAction },
      xform: xforms.rising
    },
    {
      src: { value: "/var/naked+c" },
      dest: { value: paths.actions.mediaCloneAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: "/var/naked+l" },
      dest: { value: paths.actions.mediaToggleLockAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: paths.device.mouse.wheel },
      dest: { value: paths.actions.cursor.right.mediaScroll },
      xform: xforms.scale(-0.3),
      priority: 1
    }
  ],
  [sets.rightCursorHoveringOnVideo]: [
    {
      src: { value: paths.device.mouse.wheel },
      dest: { value: paths.actions.cursor.right.mediaVolumeMod },
      xform: xforms.scale(-0.3),
      priority: 1
    },
    {
      src: { value: paths.device.keyboard.code("keys") },
      dest: { value: paths.actions.mediaOpenAction },
      xform: xforms.rising,
      priority: 201
    },
    {
      src: { value: paths.device.keyboard.code("keyq") },
      dest: { value: paths.actions.mediaBackAction },
      xform: xforms.rising
    },
    {
      src: { value: paths.device.keyboard.code("keye") },
      dest: { value: paths.actions.mediaNextAction },
      xform: xforms.rising
    },
    {
      src: { value: "/var/naked+b" },
      dest: { value: paths.actions.mediaSnapshotAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: "/var/naked+t" },
      dest: { value: paths.actions.mediaUpAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: "/var/naked+g" },
      dest: { value: paths.actions.mediaDownOrResetAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: "/var/naked+r" },
      dest: { value: paths.actions.mediaRotateAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: "/var/naked+v" },
      dest: { value: paths.actions.mediaScaleAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyx") },
      dest: { value: paths.actions.mediaRemoveAction },
      xform: xforms.rising
    },
    {
      src: { value: "/var/naked+c" },
      dest: { value: paths.actions.mediaCloneAction },
      xform: xforms.rising
    },
    {
      src: { value: "/var/naked+l" },
      dest: { value: paths.actions.mediaToggleLockAction },
      xform: xforms.rising
    }
  ],
  [sets.inputFocused]: [
    {
      src: { value: paths.device.keyboardPath },
      dest: { value: paths.noop },
      xform: xforms.noop,
      priority: 2000
    }
  ],

  [sets.rightCursorHoveringOnUI]: [
    {
      src: { value: paths.device.mouse.buttonLeft },
      dest: { value: paths.actions.cursor.right.grab },
      xform: xforms.rising
    }
  ],
  [sets.inspecting]: [
    {
      src: { value: paths.device.keyboard.key("space") },
      dest: { value: k("space-rising") },
      xform: xforms.rising
    },
    {
      src: { value: paths.device.keyboard.key("Escape") },
      dest: { value: paths.actions.stopInspecting },
      xform: xforms.rising
    },
    {
      src: { value: paths.device.keyboard.code("keyf") },
      dest: { value: paths.actions.toggleInspecting },
      xform: xforms.rising,
      priority: 200
    },
    {
      src: { value: paths.device.mouse.wheel },
      dest: { value: paths.actions.inspectZoom },
      xform: xforms.scale(inspectZoomSpeed),
      priority: 1
    },
    {
      src: { value: paths.device.mouse.movementXY },
      dest: { x: movementX, y: movementY },
      xform: xforms.split_vec2
    },
    {
      src: [paths.device.mouse.buttonMiddle, paths.device.keyboard.key(" ")],
      dest: { value: inspectPanning },
      xform: xforms.any,
      priority: 2001
    },
    {
      src: { bool: inspectPanning, value: movementX },
      dest: { value: panX },
      xform: xforms.copyIfTrue,
      priority: 2001
    },
    {
      src: { bool: inspectPanning, value: movementY },
      dest: { value: panY },
      xform: xforms.copyIfTrue,
      priority: 2001
    },
    {
      src: { bool: paths.device.mouse.buttonRight, value: movementX },
      dest: { value: rightMouseMoveX },
      xform: xforms.copyIfTrue,
      priority: 2001
    },
    {
      src: { bool: paths.device.mouse.buttonRight, value: movementY },
      dest: { value: rightMouseMoveY },
      xform: xforms.copyIfTrue,
      priority: 2001
    },
    {
      src: { value: panX },
      dest: { value: paths.actions.inspectPanX },
      xform: xforms.scale(0.001),
      priority: 2001
    },
    {
      src: { value: panY },
      dest: { value: paths.actions.inspectPanY },
      xform: xforms.scale(0.001),
      priority: 2001
    },
    {
      src: { value: rightMouseMoveX },
      dest: { value: paths.actions.inspectRotateX },
      xform: xforms.scale(0.002),
      priority: 2001
    },
    {
      src: { value: rightMouseMoveY },
      dest: { value: paths.actions.inspectRotateY },
      xform: xforms.scale(0.002),
      priority: 2001
    }
  ],
  [sets.transforming]: [
    {
      src: { value: paths.device.keyboard.key("control") },
      dest: { value: paths.actions.transformModifier },
      xform: xforms.copy,
      priority: 1001
    },
    {
      src: { value: paths.device.mouse.wheel },
      dest: { value: paths.actions.transformScroll },
      xform: xforms.copy,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyq") },
      dest: { value: paths.actions.transformRotatePrevAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keye") },
      dest: { value: paths.actions.transformRotateNextAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyg") },
      dest: { value: paths.actions.transformAxisPrevAction },
      xform: xforms.rising,
      priority: 1001
    },
    {
      src: { value: paths.device.keyboard.code("keyt") },
      dest: { value: paths.actions.transformAxisNextAction },
      xform: xforms.rising,
      priority: 1001
    }
  ],
  [sets.debugUserInput]: [
    {
      src: { value: paths.device.keyboard.code("keym") },
      dest: { value: paths.actions.debugUserInput.describeCurrentMasks },
      xform: xforms.rising,
      priority: 10
    }
  ]
});
