const Workspace = require('../models/Workspace');
const User = require('../models/User');

// Helper function to check if user has access to workspace (owner or collaborator)
const hasWorkspaceAccess = (workspace, userId) => {
  return workspace.ownerId.toString() === userId || 
         workspace.collaborators.some(collaboratorId => collaboratorId.toString() === userId);
};

exports.createWorkspace = async (req, res) => {
  try {
    const { name, created_by_user_id, clientInfo } = req.body;

    const workspace = new Workspace({
      name,
      created_by_user_id,
      icp_inputs: {},
      icp_models: {
        generated_versions: [],
        selected_version: 0
      },
      metrics: {},
      collaborators: []
    });

    await workspace.save();
    res.status(201).json({ success: true, workspace });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addCollaborator = async (req, res) => {
  try {
    const { workspaceId, collaboratorEmail } = req.body;
    const userId = req.user.userId;

    console.log({
      workspaceId,
      collaboratorEmail
    })

    const collaborator = await User.findOne({ email: collaboratorEmail });
    if (!collaborator) {
      return res.status(404).json({ success: false, error: 'Collaborator not found' });
    }
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    // Only workspace owner can add collaborators
    if (workspace.ownerId.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Only workspace owner can add collaborators' });
    }

    // Check if collaborator is already added
    if (workspace.collaborators.includes(collaborator._id)) {
      return res.status(400).json({ success: false, error: 'User is already a collaborator' });
    }

    workspace.collaborators.push(collaborator._id);
    await workspace.save();
    res.status(200).json({ success: true, workspace });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCollaborators = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.userId;
    
    const workspace = await Workspace.findById(workspaceId).populate('collaborators', 'email name');
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    if (!hasWorkspaceAccess(workspace, userId)) {
      return res.status(403).json({ success: false, error: 'You do not have access to this workspace' });
    }

    res.status(200).json({ 
      success: true, 
      collaborators: workspace.collaborators,
      ownerId: workspace.ownerId 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.removeCollaborator = async (req, res) => {
  try {
    const { workspaceId, collaboratorId } = req.body;

    console.log({
      workspaceId,
      collaboratorId
    })

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }
    
    console.log(workspace.collaborators)

    workspace.collaborators = workspace.collaborators.filter(collaborator => collaborator.toString() !== collaboratorId);
    await workspace.save();
    res.status(200).json({ success: true, workspace });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};