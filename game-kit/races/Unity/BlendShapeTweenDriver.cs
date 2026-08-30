// BlendShapeTweenDriver - DOTween-driven race morph cycling with ZERO
// animation clips. Drop next to a delivered humanoid that carries race
// blendshapes (race_cat / race_bulk - see game-kit/races/SKILL.md), assign
// the SkinnedMeshRenderer, and tween the morph weights directly.
//
// Recipe (the one law): DOTween.To(() => current, w => renderer.SetBlendShapeWeight(i, w), target, dur)
// SetBlendShapeWeight takes PERCENTS (0-100); the getter is GetBlendShapeWeight(i).
// Requires DOTween (free): https://dotween.demigiant.com
using DG.Tweening;
using UnityEngine;

namespace GameKit.Delivery
{
    public class BlendShapeTweenDriver : MonoBehaviour
    {
        [Header("Renderer carrying the race morphs")]
        public SkinnedMeshRenderer face;          // auto-found if left empty

        [Header("Shape key names as exported from Blender")]
        public string catMorphName = "race_cat";
        public string bulkMorphName = "race_bulk";

        [Header("Race morph targets (0-100)")]
        [Range(0f, 100f)] public float catTarget = 100f;
        [Range(0f, 100f)] public float bulkTarget = 0f;
        public float morphDuration = 1.2f;

        [Header("Idle life: breathe between base and target")]
        public bool idleCycle = true;
        public float cycleDuration = 3f;

        private int _cat, _bulk;
        private float _catStart;

        void Start()
        {
            if (face == null)
                face = GetComponentInChildren<SkinnedMeshRenderer>();
            if (face == null || face.sharedMesh == null) return; // nothing to drive

            _cat = face.sharedMesh.GetBlendShapeIndex(catMorphName);
            _bulk = face.sharedMesh.GetBlendShapeIndex(bulkMorphName);

            // Race morph ON (e.g. a cat-race NPC waking up).
            if (_cat >= 0) TweenTo(_cat, catTarget);
            if (_bulk >= 0) TweenTo(_bulk, bulkTarget);

            if (idleCycle && _cat >= 0)
            {
                _catStart = catTarget;
                // subtle living pulse around the target weight
                DOTween.To(() => face.GetBlendShapeWeight(_cat),
                           w => face.SetBlendShapeWeight(_cat, w),
                           _catStart * 0.92f, cycleDuration)
                    .SetLoops(-1, LoopType.Yoyo).SetEase(Ease.InOutSine);
            }
        }

        /// Tween ONE shape key to a percent weight by index.
        public Tween TweenTo(int index, float percent)
        {
            return DOTween.To(() => face.GetBlendShapeWeight(index),
                              w => face.SetBlendShapeWeight(index, w),
                              percent, morphDuration)
                .SetEase(Ease.InOutSine);
        }

        /// Convenience: find a shape key index by name at runtime.
        public int IndexOf(string shapeName) =>
            (face != null && face.sharedMesh != null)
                ? face.sharedMesh.GetBlendShapeIndex(shapeName) : -1;

        void OnDestroy()
        {
            DOTween.Kill(this);
            if (face != null) face.DOKill();
        }
    }
}
