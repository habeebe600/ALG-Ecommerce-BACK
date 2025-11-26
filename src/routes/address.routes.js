import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { 
    createAddress, 
    getAddresses, 
    updateAddress,
    setDefaultAddress, 
    deleteAddress 
} from "../controllers/address.controller.js";

const router = express.Router();

router.get("/", authMiddleware, getAddresses);
router.post("/", authMiddleware, createAddress);
router.put("/:id", authMiddleware, updateAddress);
router.delete("/:id", authMiddleware, deleteAddress);
router.patch("/:id/set-default", authMiddleware, setDefaultAddress);


export default router;
