# qwen-img-edit-2511 flavor of the lanpaint mod (the krea-2 loras pattern).

from melite_cards import LanPaintMod, Image


class Lanpaint(LanPaintMod):
    """The edit lane flavor: the anchor image (image1, slot 1 of
    the image1/image2/image3 brick) is REQUIRED and lives in the
    input zone (the mod's generic flavor keeps it optional — t2i
    families do not anchor on it)."""
    pack = "lanpaint"
    image1 = Image(label='Image 1', group='input', zone='inputs',
                   order=-1, width=1, columns=3, required=True)