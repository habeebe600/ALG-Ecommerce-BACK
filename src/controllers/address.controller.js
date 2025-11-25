import prisma from "../../prisma/prismaClient.js";
import validator from "validator";

// CREATE ADDRESS
export const createAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { fullName, phone, pincode, address, city, state, country, isDefault } = req.body;

        if (!fullName || !phone || !pincode || !address || !city || !state || !country) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!validator.isMobilePhone(phone, "any")) {
            return res.status(400).json({ message: "Invalid phone number" });
        }

        // If default, remove default from others
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }

        const newAddress = await prisma.address.create({
            data: {
                userId,
                fullName,
                phone,
                pincode,
                address,
                city,
                state,
                country,
                isDefault: isDefault || false
            }
        });

        return res.json({ message: "Address added", address: newAddress });

    } catch (err) {
        console.error("CREATE ADDRESS ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};


// GET ALL ADDRESSES
export const getAddresses = async (req, res) => {
    try {
        const userId = req.user.userId;

        const addresses = await prisma.address.findMany({
            where: { userId },
            orderBy: { isDefault: "desc" }
        });

        return res.json({ addresses });

    } catch (err) {
        console.error("GET ADDRESSES ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};


// UPDATE ADDRESS
export const updateAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { fullName, phone, pincode, address, city, state, country, isDefault } = req.body;

        // Check ownership
        const exists = await prisma.address.findFirst({
            where: { id, userId }
        });

        if (!exists) {
            return res.status(404).json({ message: "Address not found" });
        }

        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }

        const updated = await prisma.address.update({
            where: { id },
            data: {
                fullName,
                phone,
                pincode,
                address,
                city,
                state,
                country,
                isDefault
            }
        });

        return res.json({ message: "Address updated", address: updated });

    } catch (err) {
        console.error("UPDATE ADDRESS ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};


// DELETE ADDRESS
export const deleteAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const exists = await prisma.address.findFirst({
            where: { id, userId }
        });

        if (!exists) {
            return res.status(404).json({ message: "Address not found" });
        }

        await prisma.address.delete({
            where: { id }
        });

        return res.json({ message: "Address deleted" });

    } catch (err) {
        console.error("DELETE ADDRESS ERROR:", err);
        res.status(500).json({ message: "Server error" });
    }
};
