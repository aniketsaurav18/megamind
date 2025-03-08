import { Router } from "express";
import { submitController } from "../controller/submit-controller";

const submitRouter = Router();

submitRouter.post("/", submitController);
