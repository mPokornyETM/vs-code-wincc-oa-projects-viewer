/**
 * @fileoverview Tree Item Union Type
 *
 * This module defines the TreeItem union type that represents any item
 * that can appear in the WinCC OA projects tree view.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-05
 */

import { ProjectCategory } from './ProjectCategory';
import { WinCCOAProject } from './WinCCOAProject';

//------------------------------------------------------------------------------

/**
 * Union type representing any item that can appear in the project tree view.
 * This can be either a project category or an individual WinCC OA project.
 */
export type TreeItem = ProjectCategory | WinCCOAProject;
